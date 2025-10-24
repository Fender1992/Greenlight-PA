/**
 * Graceful error handling for API responses
 */

export interface ApiErrorResponse {
  success: false;
  error: string;
  status?: number;
}

/**
 * Get user-friendly error message from API error response
 */
export function getUserFriendlyErrorMessage(
  error: unknown,
  defaultMessage = "An error occurred"
): string {
  // Handle API error responses
  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "string"
  ) {
    const apiError = error as ApiErrorResponse;

    // RLS denied errors (406)
    if (
      apiError.error.includes("406") ||
      apiError.error.includes("row-level security")
    ) {
      return "Access denied. You don't have permission to access this resource.";
    }

    // Missing org_id errors (400)
    if (apiError.error.includes("org_id parameter is required")) {
      return apiError.error; // Already user-friendly
    }

    // Unauthorized (401)
    if (apiError.error === "Unauthorized" || apiError.status === 401) {
      return "Please sign in to continue.";
    }

    // Forbidden (403)
    if (apiError.status === 403) {
      if (apiError.error.includes("admin privileges")) {
        return "This action requires administrator privileges.";
      }
      if (apiError.error.includes("super admin")) {
        return "This action requires super administrator access.";
      }
      return "You don't have permission to perform this action.";
    }

    // Not found (404)
    if (apiError.status === 404) {
      return "The requested resource was not found.";
    }

    // Return the error message if it looks user-friendly
    if (apiError.error.length < 200 && !apiError.error.includes("Error:")) {
      return apiError.error;
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return "Network error. Please check your connection and try again.";
    }

    // Timeout errors
    if (error.message.includes("timeout")) {
      return "Request timed out. Please try again.";
    }

    return error.message;
  }

  // Fallback
  return defaultMessage;
}

/**
 * Handle API errors with toast notifications
 * Usage: catch(handleApiError(showToast))
 */
export function handleApiError(
  showToast: (message: string, type: "error" | "success" | "info") => void
) {
  return (error: unknown) => {
    const message = getUserFriendlyErrorMessage(error);
    showToast(message, "error");
    console.error("API Error:", error);
  };
}

/**
 * Check if error is a specific HTTP status
 */
export function isHttpError(error: unknown, status: number): boolean {
  if (typeof error === "object" && error !== null && "status" in error) {
    return (error as ApiErrorResponse).status === status;
  }
  return false;
}

/**
 * Check if error is related to missing org_id
 */
export function isMissingOrgIdError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "error" in error) {
    const errorMsg = String((error as ApiErrorResponse).error);
    return errorMsg.includes("org_id parameter is required");
  }
  return false;
}

/**
 * Check if error is RLS denied
 */
export function isRlsDeniedError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const errorMsg = JSON.stringify(error).toLowerCase();
    return (
      errorMsg.includes("row-level security") ||
      errorMsg.includes("rls") ||
      errorMsg.includes("policy")
    );
  }
  return false;
}
