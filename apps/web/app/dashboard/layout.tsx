/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: Dashboard Layout | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import supabase from "@greenlight/db/client";
import type { User } from "@supabase/supabase-js";
import { useTour } from "./hooks/useTour";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { shouldShowTour, loading: tourLoading, startTour } = useTour();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Trigger tour on first dashboard visit
  useEffect(() => {
    if (
      !loading &&
      !tourLoading &&
      shouldShowTour &&
      pathname === "/dashboard"
    ) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startTour();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, tourLoading, shouldShowTour, pathname, startTour]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showProfileMenu && !target.closest(".relative")) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const displayName = user?.email || "Guest";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link
                  href="/dashboard"
                  className="text-xl font-bold text-blue-600"
                >
                  Greenlight PA
                </Link>
              </div>
              <div
                className="hidden sm:ml-6 sm:flex sm:space-x-8"
                data-tour="navigation"
              >
                <Link
                  href="/dashboard"
                  className={
                    pathname === "/dashboard" ||
                    pathname?.startsWith("/dashboard/pa")
                      ? "border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  }
                >
                  Worklist
                </Link>
                <Link
                  href="/dashboard/patients"
                  className={
                    pathname === "/dashboard/patients"
                      ? "border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  }
                >
                  Patients
                </Link>
                <Link
                  href="/dashboard/orders"
                  className={
                    pathname?.startsWith("/dashboard/orders")
                      ? "border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  }
                >
                  Orders
                </Link>
                <Link
                  href="/dashboard/metrics"
                  className={
                    pathname === "/dashboard/metrics"
                      ? "border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  }
                >
                  Metrics
                </Link>
                <Link
                  href="/dashboard/admin"
                  className={
                    pathname === "/dashboard/admin"
                      ? "border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  }
                >
                  Admin
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {!loading && (
                <>
                  {user && (
                    <div className="relative">
                      <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center text-sm text-gray-700 hover:text-gray-900"
                      >
                        <span>{displayName}</span>
                        <svg
                          className="ml-2 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {showProfileMenu && (
                        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setShowProfileMenu(false);
                                startTour();
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Replay Product Tour
                            </button>
                            <button
                              onClick={() => {
                                setShowProfileMenu(false);
                                handleLogout();
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Logout
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!user && (
                    <Link
                      href="/"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Sign In
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
