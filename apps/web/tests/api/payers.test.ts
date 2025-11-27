/**
 * Tests for /api/payers route
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PATCH, DELETE } from "@web/app/api/payers/route";

// Mock the db module
vi.mock("@greenlight/db", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

// Mock the org module
vi.mock("@web/app/api/_lib/org", () => ({
  requireUser: vi.fn(),
  requireOrgAdmin: vi.fn(),
  HttpError: class HttpError extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message);
    }
  },
}));

describe("/api/payers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns list of all payers", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const { requireUser } = await import("@web/app/api/_lib/org");

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "payer-1",
              name: "Blue Cross Blue Shield",
              portal_url: "https://bcbs.com",
              contact: "support@bcbs.com",
              policy_links: ["https://bcbs.com/policies"],
            },
            {
              id: "payer-2",
              name: "Aetna",
              portal_url: null,
              contact: null,
              policy_links: [],
            },
          ],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const request = new NextRequest("http://localhost:3000/api/payers");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
      expect(json.data[0].name).toBe("Blue Cross Blue Shield");
    });

    it("filters payers by search query", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const { requireUser } = await import("@web/app/api/_lib/org");

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: [
            {
              id: "payer-1",
              name: "Blue Cross Blue Shield",
              portal_url: "https://bcbs.com",
              contact: null,
              policy_links: [],
            },
          ],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const request = new NextRequest(
        "http://localhost:3000/api/payers?q=blue"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(1);
      expect(mockQuery.ilike).toHaveBeenCalledWith("name", "%blue%");
    });

    it("returns 401 when user is not authenticated", async () => {
      const { requireUser, HttpError } = await import("@web/app/api/_lib/org");

      vi.mocked(requireUser).mockRejectedValue(
        new HttpError(401, "Unauthorized")
      );

      const request = new NextRequest("http://localhost:3000/api/payers");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 500 when database query fails", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const { requireUser } = await import("@web/app/api/_lib/org");

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const request = new NextRequest("http://localhost:3000/api/payers");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Database error");
    });
  });

  describe("POST", () => {
    it("creates a new payer successfully", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const { requireOrgAdmin } = await import("@web/app/api/_lib/org");

      vi.mocked(requireOrgAdmin).mockResolvedValue({
        user: { id: "user-1", email: "admin@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "admin",
        client: {} as any,
      });

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "payer-3",
            name: "United Healthcare",
            portal_url: "https://uhc.com",
            contact: "support@uhc.com",
            policy_links: ["https://uhc.com/policies"],
          },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const request = new NextRequest("http://localhost:3000/api/payers", {
        method: "POST",
        body: JSON.stringify({
          org_id: "org-1",
          name: "United Healthcare",
          portal_url: "https://uhc.com",
          contact: "support@uhc.com",
          policy_links: ["https://uhc.com/policies"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("United Healthcare");
    });

    it("creates payer with minimal required fields", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const { requireOrgAdmin } = await import("@web/app/api/_lib/org");

      vi.mocked(requireOrgAdmin).mockResolvedValue({
        user: { id: "user-1", email: "admin@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "admin",
        client: {} as any,
      });

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "payer-4",
            name: "Cigna",
            portal_url: null,
            contact: null,
            policy_links: [],
          },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const request = new NextRequest("http://localhost:3000/api/payers", {
        method: "POST",
        body: JSON.stringify({
          org_id: "org-1",
          name: "Cigna",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.name).toBe("Cigna");
      expect(mockQuery.insert).toHaveBeenCalledWith({
        name: "Cigna",
        portal_url: null,
        contact: null,
        policy_links: [],
      });
    });

    it("accepts org_id from query parameter", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const { requireOrgAdmin } = await import("@web/app/api/_lib/org");

      vi.mocked(requireOrgAdmin).mockResolvedValue({
        user: { id: "user-1", email: "admin@example.com" } as any,
        token: "token-123",
        orgId: "org-2",
        role: "admin",
        client: {} as any,
      });

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "payer-5", name: "Humana" },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const request = new NextRequest(
        "http://localhost:3000/api/payers?org_id=org-2",
        {
          method: "POST",
          body: JSON.stringify({ name: "Humana" }),
        }
      );

      await POST(request);

      expect(requireOrgAdmin).toHaveBeenCalledWith(
        expect.any(NextRequest),
        "org-2"
      );
    });

    it("returns 400 when name is missing", async () => {
      const { requireOrgAdmin } = await import("@web/app/api/_lib/org");

      vi.mocked(requireOrgAdmin).mockResolvedValue({
        user: { id: "user-1", email: "admin@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "admin",
        client: {} as any,
      });

      const request = new NextRequest("http://localhost:3000/api/payers", {
        method: "POST",
        body: JSON.stringify({ org_id: "org-1" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Payer name is required");
    });

    it("returns 403 when user is not an admin", async () => {
      const { requireOrgAdmin, HttpError } = await import(
        "@web/app/api/_lib/org"
      );

      vi.mocked(requireOrgAdmin).mockRejectedValue(
        new HttpError(
          403,
          "This operation requires admin privileges in the organization"
        )
      );

      const request = new NextRequest("http://localhost:3000/api/payers", {
        method: "POST",
        body: JSON.stringify({ org_id: "org-1", name: "Test Payer" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it("returns 500 when database insert fails", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const { requireOrgAdmin } = await import("@web/app/api/_lib/org");

      vi.mocked(requireOrgAdmin).mockResolvedValue({
        user: { id: "user-1", email: "admin@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "admin",
        client: {} as any,
      });

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Unique constraint violation" },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const request = new NextRequest("http://localhost:3000/api/payers", {
        method: "POST",
        body: JSON.stringify({ org_id: "org-1", name: "Duplicate Payer" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  });

  describe("PATCH", () => {
    it("updates a payer successfully", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const { requireOrgAdmin } = await import("@web/app/api/_lib/org");

      vi.mocked(requireOrgAdmin).mockResolvedValue({
        user: { id: "user-1", email: "admin@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "admin",
        client: {} as any,
      });

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "payer-1",
            name: "Updated Payer Name",
            portal_url: "https://updated.com",
            contact: "new@contact.com",
            policy_links: ["https://new.com"],
          },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const request = new NextRequest("http://localhost:3000/api/payers", {
        method: "PATCH",
        body: JSON.stringify({
          id: "payer-1",
          org_id: "org-1",
          name: "Updated Payer Name",
          portal_url: "https://updated.com",
          contact: "new@contact.com",
          policy_links: ["https://new.com"],
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Updated Payer Name");
    });

    it("returns 400 when org_id is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/payers", {
        method: "PATCH",
        body: JSON.stringify({
          id: "payer-1",
          name: "Updated Name",
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("org_id parameter is required for payer updates");
    });

    it("returns 400 when payer id is missing", async () => {
      const { requireOrgAdmin } = await import("@web/app/api/_lib/org");

      vi.mocked(requireOrgAdmin).mockResolvedValue({
        user: { id: "user-1", email: "admin@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "admin",
        client: {} as any,
      });

      const request = new NextRequest("http://localhost:3000/api/payers", {
        method: "PATCH",
        body: JSON.stringify({
          org_id: "org-1",
          name: "Updated Name",
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Payer id is required");
    });

    it("returns 403 when user is not an admin", async () => {
      const { requireOrgAdmin, HttpError } = await import(
        "@web/app/api/_lib/org"
      );

      vi.mocked(requireOrgAdmin).mockRejectedValue(
        new HttpError(
          403,
          "This operation requires admin privileges in the organization"
        )
      );

      const request = new NextRequest("http://localhost:3000/api/payers", {
        method: "PATCH",
        body: JSON.stringify({
          id: "payer-1",
          org_id: "org-1",
          name: "Updated",
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it("returns 500 when database update fails", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const { requireOrgAdmin } = await import("@web/app/api/_lib/org");

      vi.mocked(requireOrgAdmin).mockResolvedValue({
        user: { id: "user-1", email: "admin@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "admin",
        client: {} as any,
      });

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const request = new NextRequest("http://localhost:3000/api/payers", {
        method: "PATCH",
        body: JSON.stringify({
          id: "payer-1",
          org_id: "org-1",
          name: "Updated",
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  });

  describe("DELETE", () => {
    it("deletes a payer successfully", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const { requireOrgAdmin } = await import("@web/app/api/_lib/org");

      vi.mocked(requireOrgAdmin).mockResolvedValue({
        user: { id: "user-1", email: "admin@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "admin",
        client: {} as any,
      });

      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const request = new NextRequest(
        "http://localhost:3000/api/payers?id=payer-1&org_id=org-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("payer-1");
      expect(json.data.deleted_by).toBe("user-1");
    });

    it("returns 400 when payer id is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/payers?org_id=org-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Payer id is required");
    });

    it("returns 400 when org_id is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/payers?id=payer-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe(
        "org_id parameter is required for payer deletion"
      );
    });

    it("returns 403 when user is not an admin", async () => {
      const { requireOrgAdmin, HttpError } = await import(
        "@web/app/api/_lib/org"
      );

      vi.mocked(requireOrgAdmin).mockRejectedValue(
        new HttpError(
          403,
          "This operation requires admin privileges in the organization"
        )
      );

      const request = new NextRequest(
        "http://localhost:3000/api/payers?id=payer-1&org_id=org-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it("returns 500 when database delete fails", async () => {
      const { supabaseAdmin } = await import("@greenlight/db");
      const { requireOrgAdmin } = await import("@web/app/api/_lib/org");

      vi.mocked(requireOrgAdmin).mockResolvedValue({
        user: { id: "user-1", email: "admin@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "admin",
        client: {} as any,
      });

      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { message: "Foreign key constraint violation" },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const request = new NextRequest(
        "http://localhost:3000/api/payers?id=payer-1&org_id=org-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  });
});
