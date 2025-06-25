import { supabase } from "../supabaseService";

/**
 * Checks the storage configuration and returns diagnostic information
 * Use this to verify your storage settings and troubleshoot issues
 */
export const checkStorageSettings = async (bucketName = "images") => {
  const diagnostics = {
    success: false,
    authenticated: false,
    userId: null,
    bucketExists: false,
    bucketIsPublic: false,
    buckets: [],
    policies: [],
    error: null,
  };

  try {
    // Check authentication status
    const { data: sessionData } = await supabase.auth.getSession();
    diagnostics.authenticated = !!sessionData?.session?.user;
    diagnostics.userId = sessionData?.session?.user?.id;

    // Get all buckets
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      throw new Error(`Error listing buckets: ${bucketsError.message}`);
    }

    diagnostics.buckets = buckets.map((b) => b.name);
    diagnostics.bucketExists = buckets.some((b) => b.name === bucketName);

    // Check bucket details if it exists
    if (diagnostics.bucketExists) {
      const bucket = buckets.find((b) => b.name === bucketName);
      diagnostics.bucketIsPublic = bucket?.public || false;

      // Check for policies - this might require admin privileges
      try {
        const { data: policiesData, error: policiesError } = await supabase.rpc(
          "get_storage_policies",
          { bucket_name: bucketName }
        );

        if (!policiesError) {
          diagnostics.policies = policiesData || [];
        }
      } catch (policiesError) {
        console.warn("Could not fetch policies:", policiesError);
      }
    }

    diagnostics.success = true;
  } catch (error) {
    diagnostics.error = error.message;
    console.error("Storage settings check failed:", error);
  }

  return diagnostics;
};
