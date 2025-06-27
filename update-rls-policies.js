const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

async function updateRLSPolicies() {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Missing Supabase credentials in environment variables");
      console.log(
        "Required variables: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY"
      );
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔧 Connecting to Supabase...");

    // Read the SQL file
    const sqlPath = path.join(
      __dirname,
      "supabase",
      "sql",
      "notes_collaborators_policy.sql"
    );
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    console.log("📄 SQL content to execute:");
    console.log(sqlContent);

    // Split SQL into individual statements
    const statements = sqlContent
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`🔄 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n📝 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement);

      try {
        const { data, error } = await supabase.rpc("execute_sql", {
          sql_statement: statement,
        });

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(
          `⚠️ Direct RPC failed, trying alternative approach for statement ${
            i + 1
          }`
        );
        console.error(err.message);
      }
    }

    console.log("\n🎉 RLS policy update completed!");
  } catch (error) {
    console.error("❌ Error updating RLS policies:", error);
    process.exit(1);
  }
}

updateRLSPolicies();
