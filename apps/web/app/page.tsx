/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: HomePage | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import Link from "next/link";

export default function Home() {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      {isDemoMode && (
        <div className="mb-8 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          Demo Mode - No PHI is being processed
        </div>
      )}

      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Greenlight PA
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Prior Authorization Copilot for Healthcare Providers
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign Up
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
