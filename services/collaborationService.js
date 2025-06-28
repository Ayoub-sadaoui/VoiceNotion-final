import { supabase } from "./supabaseService";

/**
 * Insert a collaboration invite row. RLS ensures the caller must own the page.
 * @param {string} pageId
 * @param {string} email
 * @returns {Promise<{data: any, error: any}>}
 */
export const sendInvite = async (pageId, email) => {
  if (!pageId || !email) throw new Error("pageId and email are required");

  // Ensure inviter_id is set to current user ID to satisfy RLS policy
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { data: null, error: userErr || new Error("Not authenticated") };
  }

  try {
    // Check if user already has access to this page
    const { data: existingUsers, error: checkError } = await getPageUsers(
      pageId
    );
    if (checkError) {
      console.warn(
        "Failed to check existing users, proceeding with invite:",
        checkError
      );
    } else {
      const existingUser = existingUsers.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingUser) {
        if (existingUser.status === "pending") {
          return {
            data: null,
            error: new Error("User already has a pending invitation"),
          };
        } else if (existingUser.role === "owner") {
          return {
            data: null,
            error: new Error("Cannot invite the owner of the page"),
          };
        } else if (existingUser.role === "collaborator") {
          return {
            data: null,
            error: new Error("User already has access to this page"),
          };
        }
      }
    }

    // Proceed with sending the invite
    const { data, error } = await supabase
      .from("collaboration_invites")
      .insert({
        page_id: pageId,
        invitee_email: email,
        inviter_id: user.id,
        status: "pending", // ensure status so invite appears
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Invoke the Edge Function to accept invite.
 * @param {string} inviteId
 */
// Accept invite by calling edge function first; fallback to client-side DB operations if it fails
export const acceptInvite = async (inviteId) => {
  if (!inviteId) return { data: null, error: new Error("inviteId required") };

  // 1. Try edge function
  const { data, error } = await supabase.functions.invoke("accept_invite", {
    body: { invite_id: inviteId },
  });
  if (!error) {
    return { data, error: null };
  }

  console.warn(
    "Edge function accept_invite failed – falling back",
    error?.message || error
  );

  // 2. Fallback: perform acceptance via client (requires proper RLS)
  try {
    // Fetch invite row
    const { data: invite, error: fetchErr } = await supabase
      .from("collaboration_invites")
      .select("*")
      .eq("id", inviteId)
      .single();
    if (fetchErr) return { data: null, error: fetchErr };

    // Get current user
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return { data: null, error: userErr || new Error("Not authenticated") };
    }

    // Ensure current user is the invitee
    if (invite.invitee_email?.toLowerCase() !== user.email?.toLowerCase()) {
      return {
        data: null,
        error: new Error("Not authorized to accept this invite"),
      };
    }

    // Check if collaboration already exists
    const { data: existingCollab } = await supabase
      .from("page_collaborators")
      .select("id")
      .eq("page_id", invite.page_id)
      .eq("user_id", user.id)
      .single();

    if (existingCollab) {
      // If collaboration already exists, just update the invite status
      const { error: updateErr } = await supabase
        .from("collaboration_invites")
        .update({ status: "accepted" })
        .eq("id", inviteId)
        .eq("status", "pending"); // Only update if still pending
      if (updateErr) return { data: null, error: updateErr };

      return { data: { success: true }, error: null };
    }

    // Insert collaborator row
    const { error: insertErr } = await supabase
      .from("page_collaborators")
      .insert({ page_id: invite.page_id, user_id: user.id });
    if (insertErr) return { data: null, error: insertErr };

    // Update invite status to accepted
    const { error: updateErr } = await supabase
      .from("collaboration_invites")
      .update({ status: "accepted" })
      .eq("id", inviteId)
      .eq("status", "pending"); // Only update if still pending
    if (updateErr) return { data: null, error: updateErr };

    return { data: { success: true }, error: null };
  } catch (fallbackErr) {
    return { data: null, error: fallbackErr };
  }
};

/**
 * Fetch pending invites for the signed-in user by email.
 * @param {string} email – current user's email address
 */
export const fetchPendingInvites = async (email) => {
  if (!email) return { data: [], error: null };

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Get pending invites
    const { data: invites, error: invitesError } = await supabase
      .from("collaboration_invites")
      .select("*")
      .eq("status", "pending")
      .eq("invitee_email", normalizedEmail)
      .order("created_at", { ascending: false });

    if (invitesError) throw invitesError;

    // Enhance each invite with page title
    const enhancedInvites = await Promise.all(
      invites.map(async (invite) => {
        // Get page title
        const { data: pageData, error: pageError } = await supabase
          .from("notes")
          .select("title")
          .eq("id", invite.page_id)
          .single();

        return {
          ...invite,
          page_title: pageData?.title || "Untitled",
        };
      })
    );

    return { data: enhancedInvites, error: null };
  } catch (err) {
    console.error("Error fetching pending invites:", err);
    return { data: [], error: err };
  }
};

/**
 * Get all users with access to a specific page (owner + collaborators)
 * @param {string} pageId
 * @returns {Promise<{data: Array, error: any}>}
 */
export const getPageUsers = async (pageId) => {
  if (!pageId) return { data: [], error: new Error("pageId is required") };

  try {
    // Get the page and its owner ID
    const { data: pageData, error: pageError } = await supabase
      .from("notes")
      .select("user_id")
      .eq("id", pageId)
      .single();

    if (pageError) throw pageError;

    console.log("Page data:", pageData);

    // Get current user to check if they are the owner
    const {
      data: { user: currentUser },
      error: currentUserError,
    } = await supabase.auth.getUser();
    if (currentUserError) throw currentUserError;

    console.log("Current user:", currentUser?.id);

    // Get collaborators
    const { data: collaborators, error: collaboratorError } = await supabase
      .from("page_collaborators")
      .select("user_id, created_at")
      .eq("page_id", pageId);

    if (collaboratorError) throw collaboratorError;

    console.log("Collaborators:", collaborators);

    // Get pending invites
    const { data: pendingInvites, error: inviteError } = await supabase
      .from("collaboration_invites")
      .select("invitee_email, created_at")
      .eq("page_id", pageId)
      .eq("status", "pending");

    if (inviteError) throw inviteError;

    console.log("Pending invites:", pendingInvites);

    // Combine owner, collaborators, and pending invites
    const users = [];

    // Add page owner (using current user data if they are the owner)
    if (pageData.user_id === currentUser?.id) {
      users.push({
        id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || null,
        email: currentUser.email,
        avatar_url: currentUser.user_metadata?.avatar_url || null,
        role: "owner",
        access: "Full access",
        status: "active",
      });
    } else {
      // If current user is not the owner, we don't have easy access to owner's profile
      // For now, just add a placeholder (in a real app, you'd need a profiles table or API)
      users.push({
        id: pageData.user_id,
        full_name: null,
        email: "Owner",
        avatar_url: null,
        role: "owner",
        access: "Full access",
        status: "active",
      });
    }

    // Add collaborators (Note: we can't easily get their full profiles without a profiles table)
    collaborators.forEach((collab) => {
      if (collab.user_id !== pageData.user_id) {
        // Check if this collaborator is the current user
        if (collab.user_id === currentUser?.id) {
          users.push({
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || null,
            email: currentUser.email,
            avatar_url: currentUser.user_metadata?.avatar_url || null,
            role: "collaborator",
            access: "Full access",
            status: "active",
          });
        } else {
          // For other collaborators, we don't have their profile data
          users.push({
            id: collab.user_id,
            full_name: null,
            email: "Collaborator",
            avatar_url: null,
            role: "collaborator",
            access: "Full access",
            status: "active",
          });
        }
      }
    });

    // Add pending invites
    pendingInvites.forEach((invite, index) => {
      users.push({
        id: `pending_${index}`,
        full_name: null,
        email: invite.invitee_email,
        avatar_url: null,
        role: "invited",
        access: "Pending invitation",
        status: "pending",
      });
    });

    console.log("Final users list:", users);
    return { data: users, error: null };
  } catch (error) {
    console.error("Error fetching page users:", error);
    return { data: [], error };
  }
};

/**
 * Publish a page by setting is_published to true
 * @param {string} pageId
 * @returns {Promise<{data: any, error: any}>}
 */
export const publishPage = async (pageId) => {
  if (!pageId) return { data: null, error: new Error("pageId is required") };

  try {
    // Get current user to verify ownership
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return { data: null, error: userErr || new Error("Not authenticated") };
    }

    // Update the page to set is_published to true
    const { data, error } = await supabase
      .from("notes")
      .update({ is_published: true })
      .eq("id", pageId)
      .eq("user_id", user.id) // Ensure only owner can publish
      .select()
      .single();

    if (error) return { data: null, error };

    // Generate the public URL
    const baseUrl =
      process.env.EXPO_PUBLIC_PAGE_BASE_URL ||
      "https://voice-1.netlify.app/preview";
    const publicUrl = `${baseUrl}/${pageId}`;

    return {
      data: {
        ...data,
        publicUrl,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Unpublish a page by setting is_published to false
 * @param {string} pageId
 * @returns {Promise<{data: any, error: any}>}
 */
export const unpublishPage = async (pageId) => {
  if (!pageId) return { data: null, error: new Error("pageId is required") };

  try {
    // Get current user to verify ownership
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return { data: null, error: userErr || new Error("Not authenticated") };
    }

    // Update the page to set is_published to false
    const { data, error } = await supabase
      .from("notes")
      .update({ is_published: false })
      .eq("id", pageId)
      .eq("user_id", user.id) // Ensure only owner can unpublish
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Check if a page is published
 * @param {string} pageId
 * @returns {Promise<{data: any, error: any}>}
 */
export const getPagePublishStatus = async (pageId) => {
  if (!pageId) return { data: null, error: new Error("pageId is required") };

  try {
    const { data, error } = await supabase
      .from("notes")
      .select("is_published")
      .eq("id", pageId)
      .single();

    if (error) return { data: null, error };

    // Generate the public URL if published
    let publicUrl = null;
    if (data.is_published) {
      const baseUrl =
        process.env.EXPO_PUBLIC_PAGE_BASE_URL ||
        "https://voice-1.netlify.app/preview";
      publicUrl = `${baseUrl}/${pageId}`;
    }

    return {
      data: {
        isPublished: data.is_published,
        publicUrl,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Remove access for a collaborator or pending invite
 * @param {string} pageId - The page ID
 * @param {string} userIdOrEmail - User ID for collaborators or email for pending invites
 * @param {string} type - "collaborator" or "pending"
 * @returns {Promise<{data: any, error: any}>}
 */
export const removePageAccess = async (
  pageId,
  userIdOrEmail,
  type = "collaborator"
) => {
  console.log("🔥 removePageAccess called with:", {
    pageId,
    userIdOrEmail,
    type,
  });

  if (!pageId || !userIdOrEmail) {
    console.error("❌ Missing required parameters");
    return {
      data: null,
      error: new Error("pageId and userIdOrEmail are required"),
    };
  }

  try {
    // Get current user to verify they are the owner
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      console.error("❌ Authentication error:", userErr);
      return { data: null, error: userErr || new Error("Not authenticated") };
    }

    console.log("✅ Current user:", user.id);

    // Verify user is the page owner
    const { data: pageData, error: pageError } = await supabase
      .from("notes")
      .select("user_id")
      .eq("id", pageId)
      .single();

    if (pageError) {
      console.error("❌ Error fetching page data:", pageError);
      return { data: null, error: pageError };
    }

    console.log("✅ Page data:", pageData);
    console.log("✅ Page owner:", pageData.user_id);
    console.log("✅ Current user:", user.id);
    console.log("✅ Is owner?", pageData.user_id === user.id);

    if (pageData.user_id !== user.id) {
      console.error("❌ Not the page owner");
      return {
        data: null,
        error: new Error("Only the page owner can remove access"),
      };
    }

    if (type === "pending") {
      console.log("🔥 Removing pending invite for email:", userIdOrEmail);

      // First, check if the invite exists
      const { data: existingInvite, error: checkError } = await supabase
        .from("collaboration_invites")
        .select("*")
        .eq("page_id", pageId)
        .eq("invitee_email", userIdOrEmail)
        .eq("status", "pending");

      console.log("🔍 Existing invites found:", existingInvite);

      if (checkError) {
        console.error("❌ Error checking existing invites:", checkError);
      }

      // Remove pending invite
      const { data: deleteData, error: removeError } = await supabase
        .from("collaboration_invites")
        .delete()
        .eq("page_id", pageId)
        .eq("invitee_email", userIdOrEmail)
        .eq("status", "pending")
        .select(); // Add select to see what was deleted

      console.log("🗑️ Delete result:", { deleteData, removeError });

      if (removeError) {
        console.error("❌ Error removing pending invite:", removeError);
        return { data: null, error: removeError };
      }

      console.log("✅ Successfully removed pending invite");
    } else {
      console.log("🔥 Removing collaborator with user ID:", userIdOrEmail);

      // First, check if the collaborator exists
      const { data: existingCollab, error: checkError } = await supabase
        .from("page_collaborators")
        .select("*")
        .eq("page_id", pageId)
        .eq("user_id", userIdOrEmail);

      console.log("🔍 Existing collaborators found:", existingCollab);

      if (checkError) {
        console.error("❌ Error checking existing collaborators:", checkError);
      }

      // Remove collaborator
      const { data: deleteData, error: removeError } = await supabase
        .from("page_collaborators")
        .delete()
        .eq("page_id", pageId)
        .eq("user_id", userIdOrEmail)
        .select(); // Add select to see what was deleted

      console.log("🗑️ Delete result:", { deleteData, removeError });

      if (removeError) {
        console.error("❌ Error removing collaborator:", removeError);
        return { data: null, error: removeError };
      }

      console.log("✅ Successfully removed collaborator");
    }

    console.log("✅ removePageAccess completed successfully");
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error("❌ Unexpected error in removePageAccess:", err);
    return { data: null, error: err };
  }
};
