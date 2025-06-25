/**
 * Error Handler for App Initialization
 *
 * This utility helps prevent and handle common initialization errors
 * that can occur during app startup, especially on Android with Hermes.
 */

/**
 * Safe property assignment to prevent "Cannot set property of undefined" errors
 * @param {Object} target - Target object (can be undefined/null)
 * @param {string} property - Property name to set
 * @param {any} value - Value to assign
 * @param {string} context - Context for error logging
 */
export const safePropertyAssignment = (
  target,
  property,
  value,
  context = "unknown"
) => {
  try {
    if (target && typeof target === "object") {
      target[property] = value;
      return true;
    } else {
      console.warn(
        `[SafeAssign] Target is ${target} for property '${property}' in context: ${context}`
      );
      return false;
    }
  } catch (error) {
    console.error(
      `[SafeAssign] Failed to set property '${property}' in context: ${context}`,
      error
    );
    return false;
  }
};

/**
 * Safe object initialization to prevent undefined reference errors
 * @param {function} initFunction - Function to initialize object
 * @param {string} objectName - Name of object being initialized
 * @param {number} retries - Number of retries (default: 3)
 * @returns {Object|null} - Initialized object or null if failed
 */
export const safeObjectInit = async (
  initFunction,
  objectName = "object",
  retries = 3
) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await initFunction();
      console.log(
        `[SafeInit] Successfully initialized ${objectName} on attempt ${attempt}`
      );
      return result;
    } catch (error) {
      console.warn(
        `[SafeInit] Failed to initialize ${objectName} on attempt ${attempt}:`,
        error.message
      );

      if (attempt === retries) {
        console.error(
          `[SafeInit] All ${retries} attempts failed for ${objectName}:`,
          error
        );
        return null;
      }

      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }
};

/**
 * Error boundary for initialization code
 * @param {function} code - Code to execute safely
 * @param {string} context - Context description
 * @param {any} fallback - Fallback value if code fails
 */
export const safeExecute = (code, context = "unknown", fallback = null) => {
  try {
    return code();
  } catch (error) {
    console.warn(`[SafeExecute] Error in ${context}:`, error.message);

    // Don't show these initialization errors to users
    if (
      error.message.includes("Cannot set property") ||
      error.message.includes("undefined") ||
      error.message.includes("Cannot read property")
    ) {
      console.log(
        `[SafeExecute] Suppressed initialization error in ${context}`
      );
    }

    return fallback;
  }
};

/**
 * Global error handler for common React Native/Hermes errors
 */
export const setupGlobalErrorHandler = () => {
  // Handle unhandled promise rejections
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("unhandledrejection", (event) => {
      const error = event.reason;

      // Suppress common initialization errors that don't affect functionality
      if (error && typeof error.message === "string") {
        const suppressedErrors = [
          "Cannot set property",
          "handleImageGenerationCommand",
          "js engine: hermes",
        ];

        if (
          suppressedErrors.some((pattern) => error.message.includes(pattern))
        ) {
          console.log(
            "[ErrorHandler] Suppressed initialization error:",
            error.message
          );
          event.preventDefault();
          return;
        }
      }
    });
  }

  // Handle React Native errors
  if (typeof global !== "undefined" && global.ErrorUtils) {
    const originalHandler = global.ErrorUtils.getGlobalHandler();

    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      // Suppress non-fatal initialization errors
      if (!isFatal && error && typeof error.message === "string") {
        const suppressedErrors = [
          "Cannot set property",
          "handleImageGenerationCommand",
          "js engine: hermes",
        ];

        if (
          suppressedErrors.some((pattern) => error.message.includes(pattern))
        ) {
          console.log(
            "[ErrorHandler] Suppressed non-fatal error:",
            error.message
          );
          return;
        }
      }

      // Call original handler for other errors
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }

  console.log("[ErrorHandler] Global error handler initialized");
};

export default {
  safePropertyAssignment,
  safeObjectInit,
  safeExecute,
  setupGlobalErrorHandler,
};
