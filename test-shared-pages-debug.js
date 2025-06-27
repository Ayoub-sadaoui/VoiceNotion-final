/**
 * Test script to debug shared pages display issue
 */
const { supabase } = require("./services/supabaseService.js");
const { fetchSupabaseNotesOnly } = require("./services/noteService.js");

const testSharedPagesDisplay = async () => {
  try {
    console.log("🔍 Testing shared pages display...");

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log("❌ User not authenticated");
      return;
    }

    console.log("✅ Current user:", user.email);

    // Fetch all notes for this user
    const result = await fetchSupabaseNotesOnly(user.id);

    if (!result.success) {
      console.log("❌ Failed to fetch notes:", result.error);
      return;
    }

    const notes = result.notes || [];
    console.log(`📄 Total notes fetched: ${notes.length}`);

    // Separate shared and private pages
    const sharedPages = notes.filter((page) => page.isSharedWithUser);
    const privatePages = notes.filter((page) => !page.isSharedWithUser);

    console.log(`🔗 Shared pages: ${sharedPages.length}`);
    console.log(`🔒 Private pages: ${privatePages.length}`);

    if (sharedPages.length > 0) {
      console.log("\n📋 Shared pages details:");
      sharedPages.forEach((page, index) => {
        console.log(
          `  ${index + 1}. ${page.title || "Untitled"} (ID: ${page.id.substring(
            0,
            8
          )}...)`
        );
        console.log(`     isSharedWithUser: ${page.isSharedWithUser}`);
        console.log(`     parentId: ${page.parentId || "null"}`);
      });
    } else {
      console.log("ℹ️  No shared pages found for this user");
    }

    // Check page_collaborators table directly
    console.log("\n🔍 Checking page_collaborators table...");
    const { data: collaborations, error: collabError } = await supabase
      .from("page_collaborators")
      .select(
        `
        *,
        notes (
          id,
          title,
          user_id
        )
      `
      )
      .eq("user_id", user.id);

    if (collabError) {
      console.log("❌ Error checking collaborations:", collabError);
    } else {
      console.log(
        `📊 Found ${collaborations?.length || 0} collaborations for this user:`
      );
      collaborations?.forEach((collab, index) => {
        console.log(
          `  ${index + 1}. Page: ${
            collab.notes?.title || "Untitled"
          } (ID: ${collab.page_id.substring(0, 8)}...)`
        );
        console.log(`     Owner: ${collab.notes?.user_id}`);
        console.log(`     Created: ${collab.created_at}`);
      });
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

testSharedPagesDisplay();
