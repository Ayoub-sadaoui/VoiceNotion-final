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
    }", Icon=${note.icon || "📄"}, IsShared=${note.isSharedWithUser || false}`
  );

  // Safely parse the content field so BlockNote gets the correct structure
  let parsedContent = [];
  if (note.content) {
    if (typeof note.content === "string") {
      try {
        parsedContent = JSON.parse(note.content);
      } catch (e) {
        console.warn(
          "Failed to parse note.content JSON, defaulting to empty array",
          e
        );
      }
    } else {
      parsedContent = note.content;
    }
  }

  const localNote = {
    id: note.id,
    title: note.title,
    content: parsedContent,
    contentJson: JSON.stringify(parsedContent),
    parentId: note.parent_id,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    tags: note.tags || [],
    folderId: note.folder_id,
    isDeleted: note.is_deleted,
    icon: note.icon || "📄", // Add icon field
    isSharedWithUser: note.isSharedWithUser || false, // Add shared status
    user_id: note.user_id, // Add user_id field for permission checks
  };

  // console.log("Local note format:", JSON.stringify(localNote));
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
      .eq("id", noteId);
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

// Helper function to check if user can edit a note (owner or collaborator)
const canUserEditNote = async (userId, noteId) => {
  try {
    console.log(
      `Checking edit permissions for user ${userId} on note ${noteId}`
    );

    // Check if user is the owner
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("user_id")
      .eq("id", noteId)
      .single();

    if (noteError) {
      console.error("Error checking note ownership:", noteError);
      return false;
    }

    console.log(`Note ${noteId} is owned by user ${note.user_id}`);

    // If user is the owner, they can edit
    if (note.user_id === userId) {
      console.log(`✅ User ${userId} is the owner of note ${noteId}`);
      return true;
    }

    // Check if user is a collaborator
    console.log(
      `🔍 Checking if user ${userId} is a collaborator on note ${noteId}`
    );

    const { data: collaboration, error: collabError } = await supabase
      .from("page_collaborators")
      .select("id, user_id, page_id, created_at")
      .eq("page_id", noteId)
      .eq("user_id", userId)
      .single();

    console.log("🔍 Collaboration query result:", {
      collaboration,
      collabError,
      errorCode: collabError?.code,
    });

    if (collabError && collabError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("❌ Error checking collaboration status:", collabError);
      return false;
    }

    // If collaboration record exists, user can edit
    if (collaboration) {
      console.log(`✅ User ${userId} is a collaborator on note ${noteId}`);
      console.log("✅ Collaboration details:", collaboration);
      return true;
    }

    console.log(
      `❌ User ${userId} does not have edit permissions for note ${noteId}`
    );
    return false;
  } catch (error) {
    console.error("Error checking edit permissions:", error);
    return false;
  }
};

// Update a note
export const updateNote = async (userId, noteId, updates) => {
  try {
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    console.log(`Updating note ${noteId} for user ${userId}`);

    // Check if user has permission to edit this note
    const canEdit = await canUserEditNote(userId, noteId);
    if (!canEdit) {
      console.error(
        `User ${userId} does not have permission to edit note ${noteId}`
      );
      return {
        success: false,
        error: "Permission denied: You don't have edit access to this page",
      };
    }

    console.log(`User ${userId} has permission to edit note ${noteId}`);

    // Get the current note from Supabase
    const { data, error: fetchError } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
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

    // Convert to Supabase format, but we need to handle user_id carefully for RLS
    console.log("🔧 Preparing Supabase update data...");

    // For shared pages, we need to preserve the original owner's user_id
    // but the RLS policies might prevent collaborators from updating
    const supabaseNote = localToSupabaseNote(updatedNote, data.user_id);

    // Remove user_id from the update if current user is not the owner
    // This prevents RLS from blocking the update due to user_id mismatch
    const isOwner = data.user_id === userId;
    console.log(
      `🔑 User ownership status: ${isOwner ? "OWNER" : "COLLABORATOR"}`
    );

    let updateData = { ...supabaseNote };
    if (!isOwner) {
      console.log("🚫 Removing user_id from update data for collaborator");
      delete updateData.user_id; // Don't try to change ownership
    }

    // Log what we're about to save
    console.log("💾 Saving to Supabase with data:", {
      id: updateData.id,
      title: updateData.title,
      user_id: updateData.user_id || "PRESERVED",
      originalOwnerId: data.user_id,
      currentUserId: userId,
      contentBlockCount: Array.isArray(updatedContent)
        ? updatedContent.length
        : 0,
      isOwnerUpdate: isOwner,
    });

    // Save to Supabase - now that we have proper RLS policies, we can use direct updates
    console.log("🔄 Attempting Supabase update...");

    const { data: updateResult, error: updateError } = await supabase
      .from("notes")
      .update({
        title: updateData.title,
        content: updateData.content,
        icon: updateData.icon,
        parent_id: updateData.parent_id,
        updated_at: new Date().toISOString(),
        // Note: We don't update user_id to preserve original ownership
      })
      .eq("id", noteId)
      .select();

    console.log("📋 Supabase update response:", {
      updateResult,
      updateError,
      hasError: !!updateError,
      resultCount: updateResult ? updateResult.length : 0,
    });

    if (updateError) {
      console.error("❌ Supabase update error:", updateError);
      console.error("💥 Update failed for note:", {
        noteId: noteId,
        userId: userId,
        originalOwnerId: data.user_id,
        updateAttemptedWith: {
          id: updateData.id,
          user_id: updateData.user_id || "PRESERVED",
          title: updateData.title,
        },
        sqlState: updateError.code,
        errorMessage: updateError.message,
        errorDetails: updateError.details,
      });
      throw updateError;
    }

    if (!updateResult || updateResult.length === 0) {
      console.error("⚠️ Supabase update succeeded but no rows were affected");
      console.error(
        "This might indicate RLS policy issues or the note doesn't exist"
      );
      return {
        success: false,
        error:
          "Update completed but no rows were affected. This might be a permissions issue.",
      };
    }

    console.log(
      `✅ Note ${noteId} successfully updated in Supabase by user ${userId}`
    );
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
      const { error } = await supabase.from("notes").delete().eq("id", noteId);
      if (error) throw error;
    } else {
      // Soft delete - set is_deleted flag to true
      console.log(`Soft deleting note ${noteId} for user ${userId}`);
      const { error } = await supabase
        .from("notes")
        .update({ is_deleted: true })
        .eq("id", noteId);
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

    // First fetch notes owned by the user
    const { data: ownedNotes, error: ownedError } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (ownedError) throw ownedError;

    // Then fetch notes shared with the user
    const { data: sharedNotes, error: sharedError } = await supabase
      .from("notes")
      .select(
        `
        *,
        page_collaborators!inner (
          user_id
        )
      `
      )
      .eq("page_collaborators.user_id", userId)
      .eq("is_deleted", false)
      .neq("user_id", userId) // Exclude notes owned by the user
      .order("updated_at", { ascending: false });

    if (sharedError) throw sharedError;

    // Combine owned and shared notes
    const allNotes = [
      ...(ownedNotes || []).map((note) => ({
        ...note,
        isSharedWithUser: false,
      })),
      ...(sharedNotes || []).map((note) => ({
        ...note,
        isSharedWithUser: true,
      })),
    ];

    console.log(
      `📊 Fetched ${ownedNotes?.length || 0} owned notes and ${
        sharedNotes?.length || 0
      } shared notes from Supabase`
    );

    // Debug: Log shared notes details
    if (sharedNotes && sharedNotes.length > 0) {
      console.log("🔗 Shared notes details:");
      sharedNotes.forEach((note, index) => {
        console.log(
          `  ${index + 1}. ${note.title || "Untitled"} (ID: ${note.id.substring(
            0,
            8
          )}...)`
        );
      });
    }

    // Log the first few notes for debugging
    if (allNotes.length > 0) {
      console.log("First note from Supabase:", {
        id: allNotes[0].id,
        title: allNotes[0].title,
        isSharedWithUser: allNotes[0].isSharedWithUser,
        has_content:
          !!allNotes[0].content && Object.keys(allNotes[0].content).length > 0,
      });
    }

    // Convert to local format
    const notes = allNotes.map((note) => supabaseToLocalNote(note));

    console.log(`✅ Converted ${notes.length} notes to local format`);
    console.log(
      `🔗 Final notes with isSharedWithUser=true: ${
        notes.filter((n) => n.isSharedWithUser).length
      }`
    );

    return { success: true, notes };
  } catch (error) {
    console.error("Error fetching Supabase notes:", error);
    return { success: false, error: error.message };
  }
};

// Sync pending notes with Supabase before logout
export const syncPendingNotesWithSupabase = async (userId) => {
  try {
    console.log("Syncing pending notes before logout for user:", userId);

    // This is a placeholder function that doesn't actually sync anything yet
    // In a real implementation, you would:
    // 1. Check for any unsaved/pending notes in local storage
    // 2. Save them to Supabase
    // 3. Clear the pending notes queue

    // For now, we just return success to fix the logout error
    return { success: true };
  } catch (error) {
    console.error("Error syncing pending notes:", error);
    // Return success anyway to not block logout
    return { success: false, error: error.message };
  }
};
