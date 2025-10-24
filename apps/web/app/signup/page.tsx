/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: Signup Page with Organization Selection | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

"use client";

import { useState, useEffect } from "react";
import supabase from "@greenlight/db/client";

interface Organization {
  id: string;
  name: string;
  npi: string | null;
  created_at: string;
}

export default function SignupPage() {
  const [step, setStep] = useState<"credentials" | "organization">(
    "credentials"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Organization selection state
  const [orgMode, setOrgMode] = useState<"create" | "join">("join");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [newOrgName, setNewOrgName] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Auth data from step 1
  const [userId, setUserId] = useState<string>("");

  // Fetch organizations for selection
  useEffect(() => {
    if (step === "organization" && orgMode === "join") {
      fetchOrganizations();
    }
  }, [step, orgMode, orgSearch]);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const url = `/api/organizations/public${orgSearch ? `?q=${encodeURIComponent(orgSearch)}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setOrganizations(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    // Check if email already exists
    try {
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const checkData = await checkResponse.json();

      if (checkData.success && !checkData.available) {
        setError("This email is already registered. Please sign in instead.");
        setLoading(false);
        return;
      }
    } catch (checkError) {
      console.error("Error checking email:", checkError);
      // Continue with signup if check fails
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) throw error;

      if (data.user) {
        setUserId(data.user.id);
        // Move to organization selection step
        setStep("organization");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (orgMode === "join" && !selectedOrg) {
      setError("Please select an organization");
      setLoading(false);
      return;
    }

    if (orgMode === "create" && !newOrgName.trim()) {
      setError("Please enter an organization name");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email,
          createNew: orgMode === "create",
          orgId: orgMode === "join" ? selectedOrg : undefined,
          orgName: orgMode === "create" ? newOrgName : undefined,
          role: "staff", // Default role for new members
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to provision organization");
      }

      if (data.data?.status === "pending") {
        setMessage(
          "Account created! Your membership request has been submitted and is awaiting admin approval. You'll receive an email once approved."
        );
      } else {
        setMessage(
          "Account created successfully! " +
            (orgMode === "create"
              ? "You can now sign in to your new organization."
              : "Check your email to confirm your account.")
        );
      }

      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setNewOrgName("");
      setSelectedOrg("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to complete signup"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Greenlight PA
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === "credentials"
              ? "Create your account"
              : "Select your organization"}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4">
          <div
            className={`flex items-center ${step === "credentials" ? "text-blue-600" : "text-gray-400"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "credentials" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
            >
              1
            </div>
            <span className="ml-2 text-sm font-medium">Credentials</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-300"></div>
          <div
            className={`flex items-center ${step === "organization" ? "text-blue-600" : "text-gray-400"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "organization" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
            >
              2
            </div>
            <span className="ml-2 text-sm font-medium">Organization</span>
          </div>
        </div>

        {/* Step 1: Credentials */}
        {step === "credentials" && (
          <form className="mt-8 space-y-6" onSubmit={handleCredentialsSubmit}>
            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password (min 8 characters)"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Next: Select Organization"}
              </button>
            </div>

            <div className="text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <a
                href="/"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </a>
            </div>
          </form>
        )}

        {/* Step 2: Organization Selection */}
        {step === "organization" && (
          <div className="mt-8 space-y-6">
            {/* Success Message */}
            {message && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-700">{message}</p>
                <div className="mt-4">
                  <a
                    href="/"
                    className="text-sm font-medium text-green-600 hover:text-green-500"
                  >
                    Go to Sign In →
                  </a>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {!message && (
              <>
                {/* Organization Mode Toggle */}
                <div className="flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOrgMode("join")}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
                      orgMode === "join"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Join Existing Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrgMode("create")}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border ${
                      orgMode === "create"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Create New Organization
                  </button>
                </div>

                <form onSubmit={handleOrganizationSubmit}>
                  {orgMode === "join" && (
                    <div className="space-y-4">
                      {/* Search Organizations */}
                      <div>
                        <label
                          htmlFor="org-search"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Search Organizations
                        </label>
                        <input
                          id="org-search"
                          type="text"
                          value={orgSearch}
                          onChange={(e) => setOrgSearch(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Search by name..."
                        />
                      </div>

                      {/* Organization List */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Organization
                        </label>
                        <div className="border border-gray-300 rounded-md max-h-60 overflow-y-auto">
                          {loadingOrgs ? (
                            <div className="p-4 text-center text-gray-500">
                              Loading organizations...
                            </div>
                          ) : organizations.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              No organizations found
                            </div>
                          ) : (
                            organizations.map((org) => (
                              <label
                                key={org.id}
                                className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              >
                                <input
                                  type="radio"
                                  name="organization"
                                  value={org.id}
                                  checked={selectedOrg === org.id}
                                  onChange={() => setSelectedOrg(org.id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-3 block text-sm text-gray-900">
                                  {org.name}
                                  {org.npi && (
                                    <span className="ml-2 text-gray-500">
                                      (NPI: {org.npi})
                                    </span>
                                  )}
                                </span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-md bg-blue-50 p-4">
                        <p className="text-sm text-blue-700">
                          <strong>Note:</strong> Your membership request will be
                          pending until an organization admin approves it.
                        </p>
                      </div>
                    </div>
                  )}

                  {orgMode === "create" && (
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="org-name"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Organization Name
                        </label>
                        <input
                          id="org-name"
                          type="text"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter organization name"
                          required
                        />
                      </div>

                      <div className="rounded-md bg-green-50 p-4">
                        <p className="text-sm text-green-700">
                          <strong>Admin Access:</strong> You'll be the admin of
                          your new organization with full access.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setStep("credentials")}
                      className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? "Completing..." : "Complete Signup"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
