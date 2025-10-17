/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: Dashboard Layout | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@greenlight/db";
import type { User } from "@supabase/supabase-js";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const displayName = user?.email || "Demo User";

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
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="border-transparent text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium hover:border-gray-300"
                >
                  Worklist
                </Link>
                <Link
                  href="/dashboard/patients"
                  className="border-transparent text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium hover:border-gray-300"
                >
                  Patients
                </Link>
                <Link
                  href="/dashboard/orders"
                  className="border-transparent text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium hover:border-gray-300"
                >
                  Orders
                </Link>
                <Link
                  href="/dashboard/metrics"
                  className="border-transparent text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium hover:border-gray-300"
                >
                  Metrics
                </Link>
                <Link
                  href="/dashboard/admin"
                  className="border-transparent text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium hover:border-gray-300"
                >
                  Admin
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {!loading && (
                <>
                  <span className="text-sm text-gray-700">{displayName}</span>
                  {user && (
                    <button
                      onClick={handleLogout}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Logout
                    </button>
                  )}
                  {!user && (
                    <Link
                      href="/login"
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
