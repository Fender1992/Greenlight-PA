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
import { OrgProvider, useOrg } from "./OrgContext";
import { SessionManager } from "./components/SessionManager";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    selectedOrgId,
    setSelectedOrgId,
    memberships,
    loading: orgLoading,
    isSuperAdmin: isSuperAdminFromContext,
  } = useOrg();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<
    "admin" | "staff" | "referrer" | null
  >(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync isSuperAdmin from OrgContext
  useEffect(() => {
    setIsSuperAdmin(isSuperAdminFromContext);
  }, [isSuperAdminFromContext]);

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
      if (showOrgSelector && !target.closest(".org-selector-menu")) {
        setShowOrgSelector(false);
      }
      if (showMoreMenu && !target.closest(".more-menu")) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu, showNotifications, showOrgSelector, showMoreMenu]);

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
      {/* Session Manager */}
      <SessionManager />

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex h-full">
              <div className="flex-shrink-0 flex items-center">
                <Link
                  href="/dashboard"
                  className="text-xl font-bold text-blue-600"
                >
                  Greenlight PA
                </Link>
              </div>
              {/* Desktop Navigation */}
              <div
                className="hidden sm:ml-6 sm:flex sm:space-x-8 h-full"
                data-tour="navigation"
              >
                {/* Primary Navigation Links */}
                <Link
                  href="/dashboard"
                  className={`inline-flex items-center px-1 border-b-2 text-sm font-medium ${
                    pathname === "/dashboard" ||
                    pathname?.startsWith("/dashboard/pa")
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Worklist
                </Link>
                <Link
                  href="/dashboard/patients"
                  className={`inline-flex items-center px-1 border-b-2 text-sm font-medium ${
                    pathname === "/dashboard/patients"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Patients
                </Link>
                <Link
                  href="/dashboard/orders"
                  className={`inline-flex items-center px-1 border-b-2 text-sm font-medium ${
                    pathname?.startsWith("/dashboard/orders")
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Orders
                </Link>

                {/* More Dropdown Menu */}
                <div className="relative more-menu flex">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className={`inline-flex items-center px-1 border-b-2 text-sm font-medium gap-1 ${
                      pathname === "/dashboard/metrics" ||
                      pathname === "/dashboard/admin" ||
                      pathname === "/dashboard/super-admin" ||
                      pathname === "/dashboard/preferences"
                        ? "border-blue-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    More
                    <svg
                      className="h-4 w-4"
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
                  {showMoreMenu && (
                    <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <Link
                          href="/dashboard/metrics"
                          onClick={() => setShowMoreMenu(false)}
                          className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                            pathname === "/dashboard/metrics"
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700"
                          }`}
                        >
                          📊 Metrics
                        </Link>
                        {userRole === "admin" && (
                          <Link
                            href="/dashboard/admin"
                            onClick={() => setShowMoreMenu(false)}
                            className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                              pathname === "/dashboard/admin"
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-700"
                            }`}
                          >
                            ⚙️ Admin
                          </Link>
                        )}
                        {isSuperAdmin && (
                          <Link
                            href="/dashboard/super-admin"
                            onClick={() => setShowMoreMenu(false)}
                            className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                              pathname === "/dashboard/super-admin"
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-700"
                            }`}
                          >
                            👑 Super Admin
                          </Link>
                        )}
                        <Link
                          href="/dashboard/preferences"
                          onClick={() => setShowMoreMenu(false)}
                          className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                            pathname === "/dashboard/preferences"
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700"
                          }`}
                        >
                          🔧 Preferences
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {!loading && (
                <>
                  {user && (
                    <>
                      {/* Desktop elements first, then mobile menu button */}
                      {/* Notifications - Desktop only */}
                      <div className="hidden sm:block relative notifications-menu">
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
                            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                              {unreadCount > 99 ? "99+" : unreadCount}
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
                                      className={`relative ${
                                        !notification.read ? "bg-blue-50" : ""
                                      }`}
                                    >
                                      {notification.link ? (
                                        <Link
                                          href={notification.link}
                                          onClick={() => {
                                            setShowNotifications(false);
                                            if (!notification.read) {
                                              handleMarkAsRead(notification.id);
                                            }
                                          }}
                                          className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0 pr-4">
                                              <p className="text-sm font-medium text-gray-900">
                                                {notification.title}
                                              </p>
                                              <p className="text-sm text-gray-600 mt-1">
                                                {notification.message}
                                              </p>
                                              <p className="text-xs text-blue-600 mt-2">
                                                Click to view →
                                              </p>
                                            </div>
                                            {!notification.read && (
                                              <div className="flex-shrink-0">
                                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                              </div>
                                            )}
                                          </div>
                                        </Link>
                                      ) : (
                                        <div className="px-4 py-3">
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0 pr-4">
                                              <p className="text-sm font-medium text-gray-900">
                                                {notification.title}
                                              </p>
                                              <p className="text-sm text-gray-600 mt-1">
                                                {notification.message}
                                              </p>
                                            </div>
                                            {!notification.read && (
                                              <div className="flex-shrink-0">
                                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      <div className="px-4 pb-3 flex items-center gap-3">
                                        {!notification.read && (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleMarkAsRead(notification.id);
                                            }}
                                            className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                                          >
                                            Mark as read
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteNotification(
                                              notification.id
                                            );
                                          }}
                                          className="text-xs text-red-600 hover:text-red-900 transition-colors"
                                        >
                                          Delete
                                        </button>
                                        <span className="text-xs text-gray-400 ml-auto">
                                          {new Date(
                                            notification.created_at
                                          ).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Organization Selector - Desktop only (for multi-org users and super admins) */}
                      {!orgLoading &&
                        (memberships.length > 1 || isSuperAdminFromContext) && (
                          <div className="hidden sm:block relative org-selector-menu">
                            <button
                              onClick={() =>
                                setShowOrgSelector(!showOrgSelector)
                              }
                              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
                              title={
                                selectedOrgId
                                  ? memberships.find(
                                      (m) => m.org_id === selectedOrgId
                                    )?.org.name
                                  : "Select Organization"
                              }
                            >
                              <svg
                                className="h-4 w-4 text-gray-500 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                              </svg>
                              <span className="truncate">
                                {selectedOrgId
                                  ? memberships.find(
                                      (m) => m.org_id === selectedOrgId
                                    )?.org.name || "Select Org"
                                  : "Select Org"}
                              </span>
                              <svg
                                className="h-4 w-4 text-gray-500 flex-shrink-0"
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
                            {showOrgSelector && (
                              <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                <div className="py-1">
                                  <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                      Organization
                                    </h3>
                                    {isSuperAdminFromContext && (
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        👑 Super Admin Access
                                      </p>
                                    )}
                                  </div>
                                  <div className="max-h-80 overflow-y-auto">
                                    {memberships.map((membership) => (
                                      <button
                                        key={membership.org_id}
                                        onClick={() => {
                                          setSelectedOrgId(membership.org_id);
                                          setShowOrgSelector(false);
                                        }}
                                        className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                                          selectedOrgId === membership.org_id
                                            ? "bg-blue-50 border-l-4 border-blue-500"
                                            : "border-l-4 border-transparent"
                                        }`}
                                      >
                                        <div
                                          className={`font-medium ${
                                            selectedOrgId === membership.org_id
                                              ? "text-blue-700"
                                              : "text-gray-900"
                                          }`}
                                        >
                                          {membership.org.name}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {membership.role === "super_admin"
                                            ? "Super Admin"
                                            : `Role: ${membership.role}`}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      {/* Profile Menu - Desktop only */}
                      <div className="hidden sm:block relative profile-menu">
                        <button
                          onClick={() => setShowProfileMenu(!showProfileMenu)}
                          className="flex items-center text-sm text-gray-700 hover:text-gray-900 max-w-[200px]"
                        >
                          <span className="truncate">{displayName}</span>
                          <svg
                            className="ml-2 h-4 w-4 flex-shrink-0"
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

                      {/* Mobile menu button - at the end on mobile */}
                      <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        aria-expanded={showMobileMenu}
                      >
                        <span className="sr-only">Open main menu</span>
                        {!showMobileMenu ? (
                          <svg
                            className="block h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 6h16M4 12h16M4 18h16"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="block h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                      </button>
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

        {/* Mobile menu panel */}
        {showMobileMenu && !loading && user && (
          <div className="sm:hidden border-t border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              {/* Primary Navigation Links */}
              <Link
                href="/dashboard"
                onClick={() => setShowMobileMenu(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  pathname === "/dashboard" ||
                  pathname?.startsWith("/dashboard/pa")
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                Worklist
              </Link>
              <Link
                href="/dashboard/patients"
                onClick={() => setShowMobileMenu(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  pathname === "/dashboard/patients"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                Patients
              </Link>
              <Link
                href="/dashboard/orders"
                onClick={() => setShowMobileMenu(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  pathname?.startsWith("/dashboard/orders")
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                Orders
              </Link>
              <Link
                href="/dashboard/metrics"
                onClick={() => setShowMobileMenu(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  pathname === "/dashboard/metrics"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                📊 Metrics
              </Link>
              {userRole === "admin" && (
                <Link
                  href="/dashboard/admin"
                  onClick={() => setShowMobileMenu(false)}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    pathname === "/dashboard/admin"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                  }`}
                >
                  ⚙️ Admin
                </Link>
              )}
              {isSuperAdmin && (
                <Link
                  href="/dashboard/super-admin"
                  onClick={() => setShowMobileMenu(false)}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    pathname === "/dashboard/super-admin"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                  }`}
                >
                  👑 Super Admin
                </Link>
              )}
              <Link
                href="/dashboard/preferences"
                onClick={() => setShowMobileMenu(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  pathname === "/dashboard/preferences"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                🔧 Preferences
              </Link>
            </div>

            {/* Mobile org selector for multi-org users */}
            {!orgLoading &&
              (memberships.length > 1 || isSuperAdminFromContext) && (
                <div className="pt-4 pb-3 border-t border-gray-200">
                  <div className="px-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Organization
                      {isSuperAdminFromContext && (
                        <span className="ml-1">👑</span>
                      )}
                    </p>
                    <div className="space-y-1">
                      {memberships.map((membership) => (
                        <button
                          key={membership.org_id}
                          onClick={() => {
                            setSelectedOrgId(membership.org_id);
                            setShowMobileMenu(false);
                          }}
                          className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                            selectedOrgId === membership.org_id
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="font-medium">
                            {membership.org.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {membership.role === "super_admin"
                              ? "Super Admin"
                              : `Role: ${membership.role}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {/* Mobile user menu */}
            {user && (
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-4">
                  <div>
                    <div className="text-base font-medium text-gray-800">
                      {displayName}
                    </div>
                    <div className="text-sm font-medium text-gray-500">
                      {userRole}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      startTour();
                    }}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Replay Product Tour
                  </button>
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrgProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </OrgProvider>
  );
}
