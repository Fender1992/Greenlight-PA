/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Hook: useTour | Status: [Check STATUS.md] | Modified: 2025-10-20
 */

"use client";

import { useEffect, useState } from "react";
import { startProductTour } from "../components/ProductTour";
import supabase from "@greenlight/db/client";

export function useTour() {
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTourStatus();
  }, []);

  const checkTourStatus = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/member/tour-status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const hasSeenTour = result.data?.has_seen_tour ?? false;
        setShouldShowTour(!hasSeenTour);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      await fetch("/api/member/tour-status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      setShouldShowTour(false);
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
