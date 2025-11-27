"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@greenlight/db/client";

const SESSION_WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiration

export function SessionManager() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    let warningTimeout: ReturnType<typeof setTimeout> | null = null;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        if (timeUntilExpiry <= 0) {
          // Session has expired
          handleSessionExpired();
        } else if (timeUntilExpiry <= SESSION_WARNING_THRESHOLD_MS) {
          // Show warning
          setShowWarning(true);
          setTimeRemaining(Math.floor(timeUntilExpiry / 1000)); // Convert to seconds

          // Start countdown
          countdownInterval = setInterval(() => {
            setTimeRemaining((prev) => {
              if (prev <= 1) {
                handleSessionExpired();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          // Schedule warning
          const warningDelay = timeUntilExpiry - SESSION_WARNING_THRESHOLD_MS;
          warningTimeout = setTimeout(() => {
            setShowWarning(true);
            setTimeRemaining(SESSION_WARNING_THRESHOLD_MS / 1000);

            // Start countdown
            countdownInterval = setInterval(() => {
              setTimeRemaining((prev) => {
                if (prev <= 1) {
                  handleSessionExpired();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }, warningDelay);
        }
      }
    };

    const handleSessionExpired = () => {
      setShowWarning(false);
      if (countdownInterval) clearInterval(countdownInterval);
      router.push("/");
    };

    // Check session on mount
    checkSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        // Clear existing timeouts
        if (warningTimeout) clearTimeout(warningTimeout);
        if (countdownInterval) clearInterval(countdownInterval);

        if (event === "SIGNED_OUT") {
          setShowWarning(false);
          router.push("/");
        } else if (event === "TOKEN_REFRESHED") {
          // Reset warning state and reschedule
          setShowWarning(false);
          checkSession();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (warningTimeout) clearTimeout(warningTimeout);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [router]);

  const handleExtendSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error("Failed to refresh session:", error);
        return;
      }

      if (session) {
        setShowWarning(false);
      }
    } catch (error) {
      console.error("Error extending session:", error);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Session Expiring Soon
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Your session will expire in{" "}
              <span className="font-semibold text-yellow-700">
                {formatTime(timeRemaining)}
              </span>
              . Would you like to extend your session?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleExtendSession}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Extend Session
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
