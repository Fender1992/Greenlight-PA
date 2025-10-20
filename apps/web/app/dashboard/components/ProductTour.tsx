/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: ProductTour | Status: [Check STATUS.md] | Modified: 2025-10-20
 */

"use client";

import { useEffect, useRef } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

interface ProductTourProps {
  onComplete: () => void;
  autoStart?: boolean;
}

/**
 * Check if element exists and is visible
 */
function isElementVisible(selector: string): boolean {
  const element = document.querySelector(selector);
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Get responsive tour steps, filtering out steps whose targets aren't visible
 */
function getVisibleTourSteps(): DriveStep[] {
  const allSteps: DriveStep[] = [
    {
      element: "[data-tour='worklist']",
      popover: {
        title: "Welcome to Greenlight PA!",
        description:
          "This is your PA worklist. Here you can see all your prior authorization requests, filter by status, and track their progress.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='new-pa-button']",
      popover: {
        title: "Create New PA Requests",
        description:
          "Click this button to start a new prior authorization request. You'll be guided through uploading documents and entering patient information.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='status-filter']",
      popover: {
        title: "Filter by Status",
        description:
          "Use these filters to find requests by their current status - draft, submitted, pending info, approved, or denied.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='metrics']",
      popover: {
        title: "Track Your Metrics",
        description:
          "Monitor your PA performance with real-time metrics including approval rates, turnaround times, and request volumes.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='navigation']",
      popover: {
        title: "Quick Navigation",
        description:
          "Use the navigation menu to move between PA requests, patients, orders, and analytics. You can also access your profile settings here.",
        side: window.innerWidth < 640 ? "bottom" : "right",
        align: "start",
      },
    },
  ];

  // Filter to only include steps with visible elements
  return allSteps.filter((step) => {
    if (typeof step.element === "string") {
      return isElementVisible(step.element);
    }
    return true; // Include steps without specific elements
  });
}

export function ProductTour({
  onComplete,
  autoStart = false,
}: ProductTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    // Wait for DOM to be ready
    const initTimer = setTimeout(() => {
      const visibleSteps = getVisibleTourSteps();

      // Only initialize if we have at least one step
      if (visibleSteps.length === 0) {
        console.warn("No visible tour steps found, skipping tour");
        onComplete();
        return;
      }

      // Initialize driver instance
      driverRef.current = driver({
        showProgress: true,
        steps: visibleSteps,
        onDestroyStarted: () => {
          if (driverRef.current) {
            driverRef.current.destroy();
            onComplete();
          }
        },
        popoverClass: "tour-popover",
        // Allow clicking on overlay to dismiss
        allowClose: true,
        // Don't disable interactions outside popover
        disableActiveInteraction: false,
      });

      // Auto-start if specified
      if (autoStart) {
        driverRef.current.drive();
      }
    }, 500); // Give DOM time to render

    // Cleanup on unmount
    return () => {
      clearTimeout(initTimer);
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, [autoStart, onComplete]);

  return null;
}

export function startProductTour(onComplete: () => void) {
  // Wait for DOM to be ready and get visible steps
  setTimeout(() => {
    const visibleSteps = getVisibleTourSteps();

    // Only start tour if we have visible steps
    if (visibleSteps.length === 0) {
      console.warn("No visible tour steps found, skipping tour");
      onComplete();
      return;
    }

    const driverObj = driver({
      showProgress: true,
      steps: visibleSteps,
      onDestroyStarted: () => {
        driverObj.destroy();
        onComplete();
      },
      popoverClass: "tour-popover",
      allowClose: true,
      disableActiveInteraction: false,
    });

    driverObj.drive();
  }, 500);
}
