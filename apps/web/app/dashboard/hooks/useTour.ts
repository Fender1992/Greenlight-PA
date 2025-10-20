/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Hook: useTour | Status: [Check STATUS.md] | Modified: 2025-10-20
 */

"use client";

import { useEffect, useState } from "react";
import { startProductTour } from "../components/ProductTour";

export function useTour() {
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTourStatus();
  }, []);

  const checkTourStatus = async () => {
    try {
      // Use cookie-based auth (session cookie is automatically sent)
      const response = await fetch("/api/member/tour-status", {
        credentials: "include", // Ensure cookies are sent
      });

      if (response.ok) {
        const result = await response.json();
        const hasSeenTour = result.data?.has_seen_tour ?? false;
        setShouldShowTour(!hasSeenTour);
      } else if (response.status === 401) {
        // User not authenticated, don't show tour
        setShouldShowTour(false);
      }
    } catch (error) {
      console.error("Error checking tour status:", error);
    } finally {
      setLoading(false);
    }
  };

  const startTour = () => {
    startProductTour(markTourComplete);
  };

  const markTourComplete = async () => {
    try {
      // Use cookie-based auth
      const response = await fetch("/api/member/tour-status", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        setShouldShowTour(false);
      }
    } catch (error) {
      console.error("Error marking tour complete:", error);
    }
  };

  return {
    shouldShowTour,
    loading,
    startTour,
    markTourComplete,
  };
}
