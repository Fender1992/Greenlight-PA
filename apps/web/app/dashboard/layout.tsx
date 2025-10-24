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
  const [userRole, setUserRole] = useState<
    "admin" | "staff" | "referrer" | null
  >(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      link?: string;
      read: boolean;
      created_at: string;
    }>
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { shouldShowTour, loading: tourLoading, startTour } = useTour();

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // Check system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      }
    }

    // Get initial session and user role
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);

      // Fetch user's memberships and check super admin status
      if (session?.user) {
        // Get all active memberships for the user
        const { data: memberships } = await supabase
          .from("member")
          .select("role, org_id, status")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .order("created_at", { ascending: true });

        if (memberships && memberships.length > 0) {
          // Use the first (oldest) membership for role display
          // If user is admin in ANY org, show admin tab
          const hasAdminRole = memberships.some((m) => m.role === "admin");
          setUserRole(
            hasAdminRole
              ? "admin"
              : (memberships[0].role as "admin" | "staff" | "referrer")
          );
        }

        // Check if user is super admin via API (RLS blocks client queries)
        try {
          const response = await fetch("/api/super-admin/stats");
          const data = await response.json();
          setIsSuperAdmin(data.success === true);
        } catch {
          setIsSuperAdmin(false);
        }
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      // Fetch memberships and super admin status when session changes
      if (session?.user) {
        // Get all active memberships for the user
        const { data: memberships } = await supabase
          .from("member")
          .select("role, org_id, status")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .order("created_at", { ascending: true });

        if (memberships && memberships.length > 0) {
          // If user is admin in ANY org, show admin tab
          const hasAdminRole = memberships.some((m) => m.role === "admin");
          setUserRole(
            hasAdminRole
              ? "admin"
              : (memberships[0].role as "admin" | "staff" | "referrer")
          );
        } else {
          setUserRole(null);
        }

        // Check if user is super admin via API (RLS blocks client queries)
        try {
          const response = await fetch("/api/super-admin/stats");
          const data = await response.json();
          setIsSuperAdmin(data.success === true);
        } catch {
          setIsSuperAdmin(false);
        }
      } else {
        setUserRole(null);
        setIsSuperAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Trigger tour on first visit to any dashboard page
  useEffect(() => {
    if (
      !loading &&
      !tourLoading &&
      shouldShowTour &&
      pathname?.startsWith("/dashboard")
    ) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startTour();
      }, 1000); // Increased delay for better reliability
      return () => clearTimeout(timer);
    }
  }, [loading, tourLoading, shouldShowTour, pathname, startTour]);

  // Load notifications
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications");
        const data = await response.json();

        if (data.success) {
          setNotifications(data.data);
          setUnreadCount(
            data.data.filter((n: { read: boolean }) => !n.read).length
          );
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    };

    loadNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showProfileMenu && !target.closest(".profile-menu")) {
        setShowProfileMenu(false);
      }
      if (showNotifications && !target.closest(".notifications-menu")) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu, showNotifications]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
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
                {userRole === "admin" && (
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
                )}
                {isSuperAdmin && (
                  <Link
                    href="/dashboard/super-admin"
                    className={
                      pathname === "/dashboard/super-admin"
                        ? "border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    }
                  >
                    Super Admin
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {!loading && (
                <>
                  {user && (
                    <>
                      {/* Notifications */}
                      <div className="relative notifications-menu">
                        <button
                          onClick={() =>
                            setShowNotifications(!showNotifications)
                          }
                          className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                        >
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                            />
                          </svg>
                          {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </button>
                        {showNotifications && (
                          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                            <div className="py-2">
                              <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-gray-900">
                                  Notifications
                                </h3>
                                {unreadCount > 0 && (
                                  <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    Mark all as read
                                  </button>
                                )}
                              </div>
                              {notifications.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-gray-500">
                                  No notifications
                                </div>
                              ) : (
                                <div className="divide-y divide-gray-100">
                                  {notifications.map((notification) => (
                                    <div
                                      key={notification.id}
                                      className={`px-4 py-3 hover:bg-gray-50 ${
                                        !notification.read ? "bg-blue-50" : ""
                                      }`}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900">
                                            {notification.title}
                                          </p>
                                          <p className="text-sm text-gray-600 mt-1">
                                            {notification.message}
                                          </p>
                                          <div className="flex items-center gap-2 mt-2">
                                            {notification.link && (
                                              <Link
                                                href={notification.link}
                                                onClick={() => {
                                                  setShowNotifications(false);
                                                  if (!notification.read) {
                                                    handleMarkAsRead(
                                                      notification.id
                                                    );
                                                  }
                                                }}
                                                className="text-xs text-blue-600 hover:text-blue-700"
                                              >
                                                View
                                              </Link>
                                            )}
                                            {!notification.read && (
                                              <button
                                                onClick={() =>
                                                  handleMarkAsRead(
                                                    notification.id
                                                  )
                                                }
                                                className="text-xs text-gray-600 hover:text-gray-700"
                                              >
                                                Mark as read
                                              </button>
                                            )}
                                            <button
                                              onClick={() =>
                                                handleDeleteNotification(
                                                  notification.id
                                                )
                                              }
                                              className="text-xs text-red-600 hover:text-red-700"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Profile Menu */}
                      <div className="relative profile-menu">
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
                              <Link
                                href="/dashboard/preferences"
                                onClick={() => setShowProfileMenu(false)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Preferences
                              </Link>
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
                    </>
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
