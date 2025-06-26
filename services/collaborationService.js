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
  const normalized = email.trim().toLowerCase(); // currently unused
  const { data, error } = await supabase
    .from("collaboration_invites")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return { data, error };
};
