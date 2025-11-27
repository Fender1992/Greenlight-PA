/**
 * Tests for /api/_lib/org.ts helper functions
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  requireUser,
  resolveOrgId,
  resolveOrgRole,
  requireOrgAdmin,
  isSuperAdmin,
  getUserAdminOrgs,
  HttpError,
} from "@web/app/api/_lib/org";
import type { User } from "@supabase/supabase-js";

// Mock the Supabase admin client
vi.mock("@greenlight/db", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
  createScopedSupabase: vi.fn(),
}));

describe("org helper functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("HttpError", () => {
    it("creates an error with status and message", () => {
      const error = new HttpError(404, "Not found");
      expect(error.status).toBe(404);
      expect(error.message).toBe("Not found");
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("requireUser", () => {
    it("extracts token from Bearer authorization header", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const mockUser: User = {
        id: "user-1",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new Request("http://localhost:3000/api/test", {
        headers: { authorization: "Bearer test-token-123" },
      });

      const result = await requireUser(request);

      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe("test-token-123");
      expect(supabaseAdmin.auth.getUser).toHaveBeenCalledWith("test-token-123");
    });

    it("extracts token from sb-access-token cookie", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const mockUser: User = {
        id: "user-2",
        email: "cookie@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new Request("http://localhost:3000/api/test", {
        headers: { cookie: "sb-access-token=cookie-token-456; other=value" },
      });

      const result = await requireUser(request);

      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe("cookie-token-456");
    });

    it("throws 401 when no token is provided", async () => {
      const request = new Request("http://localhost:3000/api/test");

      await expect(requireUser(request)).rejects.toThrow(
        new HttpError(401, "Unauthorized")
      );
    });

    it("throws 401 when token is invalid", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: {
          message: "Invalid token",
          name: "AuthError",
          status: 401,
        } as never,
      });

      const request = new Request("http://localhost:3000/api/test", {
        headers: { authorization: "Bearer invalid-token" },
      });

      await expect(requireUser(request)).rejects.toThrow(
        new HttpError(401, "Unauthorized")
      );
    });
  });

  describe("isSuperAdmin", () => {
    it("returns true when user is a super admin", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "super-1", user_id: "user-1" },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const result = await isSuperAdmin("user-1");

      expect(result).toBe(true);
      expect(supabaseAdmin.from).toHaveBeenCalledWith("super_admin");
    });

    it("returns false when user is not a super admin", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const result = await isSuperAdmin("user-2");

      expect(result).toBe(false);
    });
  });

  describe("resolveOrgId", () => {
    const mockUser: User = {
      id: "user-1",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    it("returns providedOrgId for super admin when org exists", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      // Mock super admin check
      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "super-1" },
          error: null,
        }),
      };

      // Mock org exists check
      const orgQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "org-1" },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(orgQuery as any);

      const result = await resolveOrgId(mockUser, "org-1");

      expect(result).toBe("org-1");
    });

    it("throws 400 for super admin without providedOrgId", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "super-1" },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(superAdminQuery as any);

      await expect(resolveOrgId(mockUser, null)).rejects.toThrow(
        new HttpError(
          400,
          "org_id parameter is required for super admin operations. Please specify the target organization using the org_id query parameter or in the request body."
        )
      );
    });

    it("throws 404 when super admin provides non-existent org", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "super-1" },
          error: null,
        }),
      };

      const orgQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(orgQuery as any);

      await expect(resolveOrgId(mockUser, "nonexistent")).rejects.toThrow(
        new HttpError(404, "Organization not found")
      );
    });

    it("returns single org for user with one active membership", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ org_id: "org-1", status: "active", role: "staff" }],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any);

      const result = await resolveOrgId(mockUser, null);

      expect(result).toBe("org-1");
    });

    it("validates providedOrgId is in user active memberships", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { org_id: "org-1", status: "active", role: "admin" },
            { org_id: "org-2", status: "active", role: "staff" },
          ],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any);

      const result = await resolveOrgId(mockUser, "org-2");

      expect(result).toBe("org-2");
    });

    it("throws 403 when user has no access to providedOrgId", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ org_id: "org-1", status: "active", role: "staff" }],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any);

      await expect(resolveOrgId(mockUser, "org-999")).rejects.toThrow(
        new HttpError(
          403,
          "User does not have active access to this organization"
        )
      );
    });

    it("throws 400 when multi-org user does not specify org_id", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { org_id: "org-1", status: "active", role: "admin" },
            { org_id: "org-2", status: "active", role: "staff" },
          ],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any);

      await expect(resolveOrgId(mockUser, null)).rejects.toThrow(
        new HttpError(
          400,
          "org_id parameter is required. You have 2 organization memberships. Please specify which organization using the org_id query parameter or in the request body."
        )
      );
    });

    it("allows ambiguous resolution for multi-org users when allowAmbiguous is true", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { org_id: "org-1", status: "active", role: "admin" },
            { org_id: "org-2", status: "active", role: "staff" },
          ],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any);

      const result = await resolveOrgId(mockUser, null, {
        allowAmbiguous: true,
      });

      expect(result).toBe("org-1"); // Returns first/oldest membership
    });

    it("throws 403 when user has only pending memberships", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const activeMemberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const pendingMemberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ org_id: "org-1" }],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(activeMemberQuery as any)
        .mockReturnValueOnce(pendingMemberQuery as any);

      await expect(resolveOrgId(mockUser, null)).rejects.toThrow(
        new HttpError(
          403,
          "Your membership is pending approval. Please wait for an admin to approve your request."
        )
      );
    });

    it("throws 404 when user has no memberships", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const activeMemberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const pendingMemberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(activeMemberQuery as any)
        .mockReturnValueOnce(pendingMemberQuery as any);

      await expect(resolveOrgId(mockUser, null)).rejects.toThrow(
        new HttpError(404, "No active organization found for current user")
      );
    });
  });

  describe("resolveOrgRole", () => {
    const mockUser: User = {
      id: "user-1",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    it("returns super_admin for super admin users", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "super-1" },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(superAdminQuery as any);

      const result = await resolveOrgRole(mockUser, "org-1");

      expect(result).toBe("super_admin");
    });

    it("returns admin role for admin users", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin", status: "active" },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any);

      const result = await resolveOrgRole(mockUser, "org-1");

      expect(result).toBe("admin");
    });

    it("returns staff role for staff users", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "staff", status: "active" },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any);

      const result = await resolveOrgRole(mockUser, "org-1");

      expect(result).toBe("staff");
    });

    it("throws 403 when user has no active membership in org", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any);

      await expect(resolveOrgRole(mockUser, "org-999")).rejects.toThrow(
        new HttpError(
          403,
          "User does not have active access to this organization"
        )
      );
    });
  });

  describe("getUserAdminOrgs", () => {
    it("returns all orgs for super admin", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "super-1" },
          error: null,
        }),
      };

      const orgQuery = {
        select: vi.fn().mockResolvedValue({
          data: [{ id: "org-1" }, { id: "org-2" }, { id: "org-3" }],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(orgQuery as any);

      const result = await getUserAdminOrgs("user-1");

      expect(result).toEqual(["org-1", "org-2", "org-3"]);
    });

    it("returns only admin memberships for regular user", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      // Mock the chained response for member query
      memberQuery.eq.mockReturnValueOnce(memberQuery);
      memberQuery.eq.mockReturnValueOnce(memberQuery);
      memberQuery.eq.mockResolvedValue({
        data: [{ org_id: "org-1" }, { org_id: "org-3" }],
        error: null,
      });

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any);

      const result = await getUserAdminOrgs("user-2");

      expect(result).toEqual(["org-1", "org-3"]);
    });

    it("returns empty array when user has no admin memberships", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");

      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      // Mock the chained response for member query
      memberQuery.eq.mockReturnValueOnce(memberQuery);
      memberQuery.eq.mockReturnValueOnce(memberQuery);
      memberQuery.eq.mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any);

      const result = await getUserAdminOrgs("user-3");

      expect(result).toEqual([]);
    });
  });

  describe("requireOrgAdmin", () => {
    it("allows admin users to proceed", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const mockUser: User = {
        id: "user-1",
        email: "admin@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };

      // Mock requireUser
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock super admin check (not super admin)
      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      // Mock member query (admin role)
      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ org_id: "org-1", status: "active", role: "admin" }],
          error: null,
        }),
      };

      // Mock role query
      const roleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin", status: "active" },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(roleQuery as any);

      const { createScopedSupabase } = await import("@greenlight/db");
      vi.mocked(createScopedSupabase).mockReturnValue({} as any);

      const request = new Request("http://localhost:3000/api/test", {
        headers: { authorization: "Bearer test-token" },
      });

      const result = await requireOrgAdmin(request, "org-1");

      expect(result.role).toBe("admin");
      expect(result.orgId).toBe("org-1");
    });

    it("allows super admin users to proceed", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const mockUser: User = {
        id: "user-1",
        email: "superadmin@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };

      // Mock requireUser
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock super admin check (is super admin)
      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "super-1", user_id: "user-1" },
          error: null,
        }),
      };

      // Mock org exists check
      const orgQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "org-1" },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(orgQuery as any)
        .mockReturnValueOnce(superAdminQuery as any);

      const { createScopedSupabase } = await import("@greenlight/db");
      vi.mocked(createScopedSupabase).mockReturnValue({} as any);

      const request = new Request("http://localhost:3000/api/test", {
        headers: { authorization: "Bearer test-token" },
      });

      const result = await requireOrgAdmin(request, "org-1");

      expect(result.role).toBe("super_admin");
      expect(result.orgId).toBe("org-1");
    });

    it("throws 403 for staff users", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const mockUser: User = {
        id: "user-1",
        email: "staff@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };

      // Mock requireUser
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock super admin check (not super admin)
      const superAdminQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      // Mock member query (staff role)
      const memberQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ org_id: "org-1", status: "active", role: "staff" }],
          error: null,
        }),
      };

      // Mock role query
      const roleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "staff", status: "active" },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(memberQuery as any)
        .mockReturnValueOnce(superAdminQuery as any)
        .mockReturnValueOnce(roleQuery as any);

      const { createScopedSupabase } = await import("@greenlight/db");
      vi.mocked(createScopedSupabase).mockReturnValue({} as any);

      const request = new Request("http://localhost:3000/api/test", {
        headers: { authorization: "Bearer test-token" },
      });

      await expect(requireOrgAdmin(request, "org-1")).rejects.toThrow(
        new HttpError(
          403,
          "This operation requires admin privileges in the organization"
        )
      );
    });
  });
});
