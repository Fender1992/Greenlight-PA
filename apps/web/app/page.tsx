/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: HomePage (Login) | Status: [Check STATUS.md] | Modified: 2025-10-20
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@greenlight/db/client";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Analytics: Track password login attempt
    console.log("[Analytics] Password login attempted", {
      timestamp: new Date().toISOString(),
      method: "password",
    });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        // Analytics: Track successful login
        console.log("[Analytics] Login successful", {
          timestamp: new Date().toISOString(),
          method: "password",
          userId: data.user?.id,
        });

        // Set session cookies for API routes
        await fetch("/api/auth/set-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          }),
        });

        // Check membership status before redirecting
        try {
          const statusResponse = await fetch("/api/auth/status");
          const statusData = await statusResponse.json();

          if (!statusResponse.ok || !statusData.success) {
            // Handle pending membership
            if (statusData.error?.includes("pending approval")) {
              setError(
                "Your membership is pending approval. Please wait for an admin to approve your request."
              );
              // Sign out the user since they can't access the dashboard yet
              await supabase.auth.signOut();
              return;
            }
            // Other errors - still redirect, let dashboard handle it
          }
        } catch (statusError) {
          console.error("Status check failed:", statusError);
          // Continue to dashboard even if status check fails
        }

        // Redirect to dashboard after successful login
        router.push("/dashboard");
      }
    } catch (err) {
      // Analytics: Track login failure
      console.log("[Analytics] Login failed", {
        timestamp: new Date().toISOString(),
        method: "password",
        error: err instanceof Error ? err.message : "Unknown error",
      });

      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Analytics: Track magic link attempt
    console.log("[Analytics] Magic link requested", {
      timestamp: new Date().toISOString(),
      method: "magic_link",
    });

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) throw error;

      // Analytics: Track magic link sent successfully
      console.log("[Analytics] Magic link sent", {
        timestamp: new Date().toISOString(),
        method: "magic_link",
      });

      setMessage("Check your email for the magic link!");
    } catch (err) {
      // Analytics: Track magic link failure
      console.log("[Analytics] Magic link failed", {
        timestamp: new Date().toISOString(),
        method: "magic_link",
        error: err instanceof Error ? err.message : "Unknown error",
      });

      setError(
        err instanceof Error ? err.message : "Failed to send magic link"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Login Section */}
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Hero Section - Left Side */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-12 py-24">
          <div className="max-w-xl">
            <h1 className="text-5xl font-bold text-white mb-6">
              Greenlight PA
            </h1>
            <p className="text-2xl text-blue-100 mb-12">
              Streamline prior authorizations and get back to patient care
            </p>

            {/* Why Greenlight Panel */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">
                Why Greenlight?
              </h2>
              <ul className="space-y-4" role="list">
                <li className="flex items-start">
                  <svg
                    className="h-6 w-6 text-blue-200 mr-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-blue-50">
                    Automate PA workflows with intelligent document processing
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-6 text-blue-200 mr-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span className="text-blue-50">
                    Reduce turnaround time from days to hours
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-6 text-blue-200 mr-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span className="text-blue-50">
                    HIPAA-compliant with enterprise-grade security
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-6 text-blue-200 mr-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                    />
                  </svg>
                  <span className="text-blue-50">
                    Real-time tracking and analytics dashboard
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Login Form - Right Side */}
        <div className="flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            {/* Header */}
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 lg:hidden">
                Greenlight PA
              </h2>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 hidden lg:block">
                Sign in
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Access your prior authorization dashboard
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="rounded-md bg-red-50 p-4"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div
                className="rounded-md bg-green-50 p-4"
                role="status"
                aria-live="polite"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="email-address" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <a
                    href="/signup"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Don't have an account? Sign up
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Signing in..." : "Sign in with password"}
                </button>

                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send magic link"}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Protected by Row Level Security (RLS) and multi-tenant data
                isolation
              </p>
            </div>

            {/* Metrics Strip */}
            <div className="pt-8 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">70%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Faster processing
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">99.9%</p>
                  <p className="text-xs text-gray-500 mt-1">Uptime SLA</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">24/7</p>
                  <p className="text-xs text-gray-500 mt-1">Support</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About This Application Section */}
      <div className="bg-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              About This Application
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Greenlight PA is a comprehensive prior authorization management
              platform designed to help healthcare providers streamline their PA
              workflows and improve patient care.
            </p>
          </div>

          {/* Overview Section */}
          <div className="mb-20">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                What is Greenlight PA?
              </h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Greenlight PA is a modern, AI-powered platform that transforms
                the complex and time-consuming process of prior authorization
                into a streamlined, efficient workflow. Built specifically for
                healthcare clinics, imaging centers, and specialty practices, we
                help you spend less time on administrative tasks and more time
                on patient care.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Our platform leverages intelligent automation, real-time
                tracking, and comprehensive analytics to help you navigate the
                PA process with confidence and precision.
              </p>
            </div>
          </div>

          {/* Who It's For Section */}
          <div className="mb-20">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Who Is This For?
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white border-2 border-blue-100 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-blue-600"
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
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">
                  Healthcare Clinics
                </h4>
                <p className="text-gray-600">
                  Primary care practices, specialty clinics, and multi-provider
                  groups looking to streamline their authorization workflows and
                  reduce administrative burden.
                </p>
              </div>

              <div className="bg-white border-2 border-blue-100 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">
                  Imaging Centers
                </h4>
                <p className="text-gray-600">
                  Diagnostic imaging facilities that need to obtain prior
                  authorizations for MRIs, CTs, PET scans, and other advanced
                  imaging procedures.
                </p>
              </div>

              <div className="bg-white border-2 border-blue-100 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">
                  Specialty Practices
                </h4>
                <p className="text-gray-600">
                  Cardiology, orthopedics, oncology, and other specialty
                  practices that regularly deal with complex authorization
                  requirements for specialized treatments.
                </p>
              </div>
            </div>
          </div>

          {/* Key Problems Solved Section */}
          <div className="mb-20">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Problems We Solve
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border-l-4 border-blue-600 shadow-md rounded-lg p-6">
                <div className="flex items-start">
                  <svg
                    className="w-6 h-6 text-blue-600 mt-1 mr-4 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Time-Consuming Manual Submissions
                    </h4>
                    <p className="text-gray-600">
                      Replace hours of manual form-filling, phone calls, and fax
                      submissions with automated workflows that handle the
                      tedious work for you.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-l-4 border-blue-600 shadow-md rounded-lg p-6">
                <div className="flex items-start">
                  <svg
                    className="w-6 h-6 text-blue-600 mt-1 mr-4 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Tracking Multiple Payer Requirements
                    </h4>
                    <p className="text-gray-600">
                      Keep track of PA status across different insurance
                      carriers with a centralized dashboard that shows all your
                      requests in one place.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-l-4 border-blue-600 shadow-md rounded-lg p-6">
                <div className="flex items-start">
                  <svg
                    className="w-6 h-6 text-blue-600 mt-1 mr-4 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Incomplete Documentation Leading to Denials
                    </h4>
                    <p className="text-gray-600">
                      AI-powered checklist generation ensures you have all
                      required documentation before submission, reducing denial
                      rates and resubmissions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-l-4 border-blue-600 shadow-md rounded-lg p-6">
                <div className="flex items-start">
                  <svg
                    className="w-6 h-6 text-blue-600 mt-1 mr-4 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Lack of Performance Insights
                    </h4>
                    <p className="text-gray-600">
                      Analyze approval rates, turnaround times, and bottlenecks
                      with comprehensive analytics to continuously improve your
                      PA process.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mb-20">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              How It Works
            </h3>
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  1
                </div>
                <div className="flex-1 bg-gradient-to-r from-blue-50 to-transparent rounded-lg p-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Create PA Requests from Clinical Orders
                  </h4>
                  <p className="text-gray-600">
                    Import or manually enter patient and procedure information
                    to initiate a prior authorization request. Our system
                    integrates with your existing clinical workflows.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  2
                </div>
                <div className="flex-1 bg-gradient-to-r from-blue-50 to-transparent rounded-lg p-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    AI-Powered Checklist Generation
                  </h4>
                  <p className="text-gray-600">
                    Our AI analyzes payer-specific requirements and
                    automatically generates a comprehensive checklist of all
                    documentation needed for approval, reducing errors and
                    omissions.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  3
                </div>
                <div className="flex-1 bg-gradient-to-r from-blue-50 to-transparent rounded-lg p-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Medical Necessity Statement Generation
                  </h4>
                  <p className="text-gray-600">
                    Generate compelling medical necessity statements based on
                    clinical information, payer guidelines, and best practices
                    to strengthen your authorization requests.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  4
                </div>
                <div className="flex-1 bg-gradient-to-r from-blue-50 to-transparent rounded-lg p-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Real-Time Status Tracking
                  </h4>
                  <p className="text-gray-600">
                    Monitor all your PA requests in real-time with status
                    updates, notifications, and alerts. Know exactly where each
                    request stands without making phone calls.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  5
                </div>
                <div className="flex-1 bg-gradient-to-r from-blue-50 to-transparent rounded-lg p-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Analytics Dashboard for Performance Insights
                  </h4>
                  <p className="text-gray-600">
                    Access powerful analytics to understand your approval rates,
                    average turnaround times, common denial reasons, and
                    identify opportunities for process improvements.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Highlight Section */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 md:p-12 text-white">
            <h3 className="text-2xl font-bold mb-8 text-center">
              Key Features at a Glance
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 mr-3 flex-shrink-0 text-blue-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-50">
                  Automated workflow management
                </span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 mr-3 flex-shrink-0 text-blue-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-50">
                  AI-powered document analysis
                </span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 mr-3 flex-shrink-0 text-blue-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-50">
                  Multi-payer support and tracking
                </span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 mr-3 flex-shrink-0 text-blue-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-50">
                  Real-time status notifications
                </span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 mr-3 flex-shrink-0 text-blue-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-50">
                  Comprehensive analytics and reporting
                </span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 mr-3 flex-shrink-0 text-blue-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-50">HIPAA-compliant security</span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 mr-3 flex-shrink-0 text-blue-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-50">Multi-organization support</span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 mr-3 flex-shrink-0 text-blue-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-50">Role-based access control</span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 mr-3 flex-shrink-0 text-blue-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-blue-50">Mobile-friendly interface</span>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <p className="text-lg text-gray-600 mb-6">
              Ready to transform your prior authorization process?
            </p>
            <a
              href="#"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Sign In to Get Started
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
