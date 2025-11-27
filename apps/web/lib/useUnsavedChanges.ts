"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  message?: string;
}

/**
 * Hook to detect and warn about unsaved changes
 *
 * Usage:
 * ```tsx
 * const [hasChanges, setHasChanges] = useState(false);
 * useUnsavedChanges({ hasUnsavedChanges: hasChanges });
 * ```
 *
 * @param options Configuration options
 * @param options.hasUnsavedChanges Whether there are currently unsaved changes
 * @param options.message Custom message to show (default: "You have unsaved changes. Are you sure you want to leave?")
 */
export function useUnsavedChanges({
  hasUnsavedChanges,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: UseUnsavedChangesOptions) {
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  // Handle browser navigation (refresh, close tab, back button)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        // Modern browsers ignore custom messages and show their own
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);

  // Handle client-side navigation (Next.js router)
  useEffect(() => {
    // Store original router methods
    const originalPush = router.push;
    const originalReplace = router.replace;
    const originalBack = router.back;

    // Create wrapper function for navigation confirmation
    const confirmNavigation = (): boolean => {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        return window.confirm(message);
      }
      return true;
    };

    // Override router.push
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push = (href: string, options?: Record<string, unknown>) => {
      if (confirmNavigation()) {
        isNavigatingRef.current = true;
        return originalPush.call(router, href, options as never);
      }
      // Return a promise that resolves immediately if navigation was cancelled
      return Promise.resolve(false) as never;
    };

    // Override router.replace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace = (href: string, options?: Record<string, unknown>) => {
      if (confirmNavigation()) {
        isNavigatingRef.current = true;
        return originalReplace.call(router, href, options as never);
      }
      return Promise.resolve(false) as never;
    };

    // Override router.back
    router.back = () => {
      if (confirmNavigation()) {
        isNavigatingRef.current = true;
        return originalBack.call(router);
      }
    };

    // Cleanup: restore original methods
    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
      router.back = originalBack;
      isNavigatingRef.current = false;
    };
  }, [hasUnsavedChanges, message, router]);

  // Provide a callback to allow programmatic navigation without confirmation
  const allowNavigation = useCallback(() => {
    isNavigatingRef.current = true;
  }, []);

  return { allowNavigation };
}
