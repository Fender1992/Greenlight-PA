/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: ProductTour | Status: [Check STATUS.md] | Modified: 2025-10-20
 */

"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

interface ProductTourProps {
  onComplete: () => void;
  autoStart?: boolean;
}

export function ProductTour({
  onComplete,
  autoStart = false,
}: ProductTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    // Initialize driver instance
    driverRef.current = driver({
      showProgress: true,
      steps: [
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
              "Use the sidebar to navigate between PA requests, patients, orders, and analytics. You can also access your profile settings here.",
            side: "right",
            align: "start",
          },
        },
      ],
      onDestroyStarted: () => {
        if (driverRef.current) {
          driverRef.current.destroy();
          onComplete();
        }
      },
    });

    // Auto-start if specified
    if (autoStart) {
      driverRef.current.drive();
    }

    // Cleanup on unmount
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, [autoStart, onComplete]);

  return null;
}

export function startProductTour(onComplete: () => void) {
  const driverObj = driver({
    showProgress: true,
    steps: [
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
            "Use the sidebar to navigate between PA requests, patients, orders, and analytics. You can also access your profile settings here.",
          side: "right",
          align: "start",
        },
      },
    ],
    onDestroyStarted: () => {
      driverObj.destroy();
      onComplete();
    },
  });

  driverObj.drive();
}
