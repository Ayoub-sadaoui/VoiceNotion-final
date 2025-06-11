import { supabase } from "./supabaseService";
import { v4 as uuidv4 } from "uuid";

// Generate a unique note ID as fallback when UUID fails
const generateNoteId = () => {
  return (
    "note_" +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// Convert Supabase note to local format
export const supabaseToLocalNote = (note) => {
  console.log(
    `Converting Supabase note to local format: ID=${note.id}, Title="${
      note.title
    }", Icon=${note.icon || "📄"}`
  );

  const localNote = {
    id: note.id,
    title: note.title,
    content: note.content || {},
    contentJson: note.content ? JSON.stringify(note.content) : "{}",
    parentId: note.parent_id,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    tags: note.tags || [],
    folderId: note.folder_id,
    isDeleted: note.is_deleted,
    icon: note.icon || "📄", // Add icon field
  };

  console.log("Local note format:", JSON.stringify(localNote));
  return localNote;
};

// Convert local note to Supabase format
export const localToSupabaseNote = (note, userId) => {
  console.log(
    `Converting note to Supabase format: ID=${note.id}, Title="${
      note.title
    }", Icon=${note.icon || "📄"}`
  );

  const supabaseNote = {
    id: note.id,
    title: note.title,
    content: note.content || {},
    parent_id: note.parentId,
    user_id: userId,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    tags: note.tags || [],
    folder_id: note.folderId,
    is_deleted: note.isDeleted || false,
    icon: note.icon || "📄", // Add icon field
  };

  console.log("Supabase note format:", JSON.stringify(supabaseNote));
  return supabaseNote;
};

// Get notes from Supabase
export const getLocalNotes = async (userId) => {
  try {
    if (!userId) {
      return {};
    }

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false);

    if (error) throw error;

    // Convert to local format
    const notes = {};
    for (const note of data) {
      const localNote = supabaseToLocalNote(note);
      notes[localNote.id] = localNote;
    }

    return notes;
  } catch (error) {
    console.error("Error getting notes from Supabase:", error);
    return {};
  }
};

// Get a note from Supabase
export const getLocalNote = async (noteId, userId) => {
  try {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return data ? supabaseToLocalNote(data) : null;
  } catch (error) {
    console.error("Error getting note from Supabase:", error);
    return null;
  }
};

// Save a note to Supabase
export const saveLocalNote = async (note, userId) => {
  try {
    if (!userId) return null;

    const supabaseNote = localToSupabaseNote(note, userId);

    // Check if note exists
    const { data: existingNote } = await supabase
      .from("notes")
      .select("id")
      .eq("id", note.id)
      .single();

    if (existingNote) {
      // Update
      const { error } = await supabase
        .from("notes")
        .update(supabaseNote)
        .eq("id", note.id);

      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase.from("notes").insert(supabaseNote);

      if (error) throw error;
    }

    return note;
  } catch (error) {
    console.error("Error saving note to Supabase:", error);
    return null;
  }
};

// Delete a note from Supabase (soft delete)
export const deleteLocalNote = async (noteId, userId) => {
  try {
    if (!userId) return false;

    const { error } = await supabase
      .from("notes")
      .update({ is_deleted: true })
      .eq("id", noteId)
      .eq("user_id", userId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error deleting note from Supabase:", error);
    return false;
  }
};

// Create a new note
export const createNote = async (userId, noteData = {}) => {
  try {
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    // Try to use the provided ID or generate a new one with fallback
    let noteId = noteData.id;
    if (!noteId) {
      try {
        noteId = uuidv4();
      } catch (uuidError) {
        console.warn(
          "UUID generation failed, using fallback:",
          uuidError.message
        );
        noteId = generateNoteId();
      }
    }

    const note = {
      id: noteId,
      title: noteData.title || "Untitled",
      content: noteData.content || {},
      parentId: noteData.parentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: noteData.tags || [],
      folderId: noteData.folderId || null,
      isDeleted: false,
    };

    // Save to Supabase
    const supabaseNote = localToSupabaseNote(note, userId);

    const { error } = await supabase.from("notes").insert(supabaseNote);

    if (error) throw error;

    return { success: true, note };
  } catch (error) {
    console.error("Error creating note:", error);
    return { success: false, error: error.message };
  }
};

// Update a note
export const updateNote = async (userId, noteId, updates) => {
  try {
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    console.log(`Updating note ${noteId} for user ${userId}`);

    // Get the current note from Supabase
    const { data, error: fetchError } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching note for update:", fetchError);
      throw fetchError;
    }

    if (!data) {
      console.error("Note not found for update");
      return { success: false, error: "Note not found" };
    }

    // Process content field - IMPORTANT: We want to REPLACE content, not merge
    let updatedContent = null;

    // If content is provided directly, use it
    if (updates.content) {
      updatedContent = updates.content;
      console.log("Using provided content object for update");
    }
    // Otherwise try to parse contentJson if available
    else if (updates.contentJson) {
      console.log("Parsing contentJson for update");
      try {
        if (typeof updates.contentJson === "string") {
          updatedContent = JSON.parse(updates.contentJson);
        } else {
          updatedContent = updates.contentJson;
        }
      } catch (parseError) {
        console.error("Error parsing contentJson:", parseError);
        // Use empty array as fallback for BlockNote content
        updatedContent = [];
      }
    }

    // Ensure content is an array for BlockNote format
    if (updatedContent && !Array.isArray(updatedContent)) {
      console.warn("Content is not an array, converting to array format");
      if (typeof updatedContent === "string") {
        try {
          updatedContent = JSON.parse(updatedContent);
        } catch (parseError) {
          console.error("Error parsing content string:", parseError);
          updatedContent = [];
        }
      } else {
        // If it's an object but not an array, wrap it in an array
        updatedContent = [updatedContent];
      }
    }

    // Process content to ensure all blocks have valid content
    if (Array.isArray(updatedContent)) {
      updatedContent = updatedContent.map((block) => {
        // If the block has no content array or empty content, add a default text node
        if (
          !block.content ||
          !Array.isArray(block.content) ||
          block.content.length === 0
        ) {
          return {
            ...block,
            content: [{ type: "text", text: "", styles: {} }],
          };
        }
        return block;
      });
    }

    // Create a new note object with updated fields
    const updatedNote = {
      ...supabaseToLocalNote(data),
      ...updates,
      content: updatedContent || [], // Always use the new content, completely replacing old content
      updatedAt: new Date().toISOString(),
    };

    // Log the updated note for debugging
    console.log(
      "Updated note before saving to Supabase:",
      JSON.stringify({
        id: updatedNote.id,
        title: updatedNote.title,
        icon: updatedNote.icon,
        contentSize: updatedContent ? JSON.stringify(updatedContent).length : 0,
        contentBlockCount: Array.isArray(updatedContent)
          ? updatedContent.length
          : 0,
      })
    );

    // Convert to Supabase format
    const supabaseNote = localToSupabaseNote(updatedNote, userId);

    // Save to Supabase
    const { error: updateError } = await supabase
      .from("notes")
      .update(supabaseNote)
      .eq("id", noteId);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      throw updateError;
    }

    console.log("Note successfully updated in Supabase");
    return { success: true, note: updatedNote };
  } catch (error) {
    console.error("Error updating note:", error);
    return { success: false, error: error.message };
  }
};

// Delete a note
export const deleteNote = async (userId, noteId, hardDelete = false) => {
  try {
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    if (hardDelete) {
      // Hard delete - completely remove from Supabase
      console.log(`Hard deleting note ${noteId} for user ${userId}`);
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", userId);

      if (error) throw error;
    } else {
      // Soft delete - set is_deleted flag to true
      console.log(`Soft deleting note ${noteId} for user ${userId}`);
      const { error } = await supabase
        .from("notes")
        .update({ is_deleted: true })
        .eq("id", noteId)
        .eq("user_id", userId);

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting note:", error);
    return { success: false, error: error.message };
  }
};

// Fetch all notes from Supabase
export const fetchNotesFromSupabase = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    // Convert to local format
    const notes = {};
    for (const note of data) {
      const localNote = supabaseToLocalNote(note);
      notes[localNote.id] = localNote;
    }

    return { success: true, notes };
  } catch (error) {
    console.error("Error fetching notes from Supabase:", error);
    return { success: false, error: error.message };
  }
};

// Fetch only Supabase notes
export const fetchSupabaseNotesOnly = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    console.log(`Fetching notes from Supabase for user ${userId}`);

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    console.log(`Fetched ${data.length} notes from Supabase`);

    // Log the first few notes for debugging
    if (data.length > 0) {
      console.log("First note from Supabase:", {
        id: data[0].id,
        title: data[0].title,
        has_content:
          !!data[0].content && Object.keys(data[0].content).length > 0,
      });
    }

    // Convert to local format
    const notes = data.map((note) => supabaseToLocalNote(note));

    return { success: true, notes };
  } catch (error) {
    console.error("Error fetching Supabase notes:", error);
    return { success: false, error: error.message };
  }
};
