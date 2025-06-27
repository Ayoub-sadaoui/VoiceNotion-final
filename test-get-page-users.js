const { getPageUsers } = require("./services/collaborationService");

// Test the getPageUsers function
async function testGetPageUsers() {
  console.log("Testing getPageUsers function...");

  // You'll need to replace this with an actual page ID from your database
  const testPageId = "test-page-id";

  try {
    const result = await getPageUsers(testPageId);
    console.log("Result:", result);

    if (result.error) {
      console.error("Error:", result.error);
    } else {
      console.log("Users found:", result.data);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testGetPageUsers();
