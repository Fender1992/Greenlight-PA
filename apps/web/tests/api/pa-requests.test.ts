/**
 * Tests for /api/pa-requests route
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@web/app/api/pa-requests/route";

// Mock the org module
vi.mock("@web/app/api/_lib/org", () => ({
  getOrgContext: vi.fn(),
  HttpError: class HttpError extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message);
    }
  },
}));

// Mock validation
vi.mock("@web/lib/validation", () => ({
  validatePaRequestCreate: vi.fn(),
}));

describe("/api/pa-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns list of PA requests with default pagination", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: "pa-1",
              org_id: "org-1",
              order_id: "order-1",
              payer_id: "payer-1",
              status: "draft",
              priority: "standard",
              order: {
                id: "order-1",
                modality: "MRI Brain",
                patient_id: "patient-1",
                patient: { id: "patient-1", name: "John Doe" },
                provider_id: "provider-1",
                provider: { id: "provider-1", name: "Dr. Smith" },
              },
              payer: { id: "payer-1", name: "Blue Cross" },
            },
          ],
          error: null,
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/pa-requests");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].status).toBe("draft");
      expect(json.pagination).toEqual({ limit: 50, offset: 0 });
    });

    it("returns success when status filter is provided", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");

      // Create a fully chainable query mock that can be awaited
      const mockQuery: any = {
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.order = vi.fn(() => mockQuery);
      mockQuery.range = vi.fn(() => mockQuery);

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn(() => mockQuery),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pa-requests?status=submitted"
      );
      const response = await GET(request);

      // Verify request succeeds with status filter
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
    });

    it("filters by patient_id in memory after query", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: "pa-1",
              order: { patient_id: "patient-1" },
            },
            {
              id: "pa-2",
              order: { patient_id: "patient-2" },
            },
          ],
          error: null,
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pa-requests?patient_id=patient-1"
      );
      const response = await GET(request);

      const json = await response.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe("pa-1");
    });

    it("respects limit and offset query parameters", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/pa-requests?limit=20&offset=10"
      );
      const response = await GET(request);

      const json = await response.json();
      expect(json.pagination).toEqual({ limit: 20, offset: 10 });
      expect(mockClient.range).toHaveBeenCalledWith(10, 29);
    });

    it("includes order, patient, provider, and payer relations", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/pa-requests");
      await GET(request);

      const selectCall = mockClient.select.mock.calls[0][0];
      expect(selectCall).toContain("order:order_id");
      expect(selectCall).toContain("patient:patient_id");
      expect(selectCall).toContain("provider:provider_id");
      expect(selectCall).toContain("payer:payer_id");
    });

    it("returns 401 when user is not authenticated", async () => {
      const { getOrgContext, HttpError } = await import(
        "@web/app/api/_lib/org"
      );

      vi.mocked(getOrgContext).mockRejectedValue(
        new HttpError(401, "Unauthorized")
      );

      const request = new NextRequest("http://localhost:3000/api/pa-requests");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 500 when database query fails", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/pa-requests");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Database error");
    });
  });

  describe("POST", () => {
    it("creates a new PA request successfully", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validatePaRequestCreate } = await import("@web/lib/validation");

      vi.mocked(validatePaRequestCreate).mockReturnValue({
        success: true,
        data: {
          order_id: "order-1",
          payer_id: "payer-1",
          priority: "standard",
        },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "pa-1",
            org_id: "org-1",
            order_id: "order-1",
            payer_id: "payer-1",
            status: "draft",
            priority: "standard",
            created_by: "user-1",
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/pa-requests", {
        method: "POST",
        body: JSON.stringify({
          order_id: "order-1",
          payer_id: "payer-1",
          priority: "standard",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("draft");
      expect(json.data.created_by).toBe("user-1");
    });

    it("creates PA request with urgent priority", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validatePaRequestCreate } = await import("@web/lib/validation");

      vi.mocked(validatePaRequestCreate).mockReturnValue({
        success: true,
        data: {
          order_id: "order-1",
          payer_id: "payer-1",
          priority: "urgent",
        },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "pa-2",
            org_id: "org-1",
            order_id: "order-1",
            payer_id: "payer-1",
            status: "draft",
            priority: "urgent",
            created_by: "user-1",
          },
          error: null,
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/pa-requests", {
        method: "POST",
        body: JSON.stringify({
          order_id: "order-1",
          payer_id: "payer-1",
          priority: "urgent",
        }),
      });

      const response = await POST(request);

      const json = await response.json();
      expect(json.data.priority).toBe("urgent");
    });

    it("creates status event audit log on creation", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validatePaRequestCreate } = await import("@web/lib/validation");

      vi.mocked(validatePaRequestCreate).mockReturnValue({
        success: true,
        data: {
          order_id: "order-1",
          payer_id: "payer-1",
          priority: "standard",
        },
      });

      const mockStatusEventInsert = vi.fn().mockResolvedValue({ error: null });
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "pa_request") {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "pa-1",
                  org_id: "org-1",
                  order_id: "order-1",
                  payer_id: "payer-1",
                  status: "draft",
                  priority: "standard",
                  created_by: "user-1",
                },
                error: null,
              }),
            };
          }
          if (table === "status_event") {
            return {
              insert: mockStatusEventInsert,
            };
          }
          return {};
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/pa-requests", {
        method: "POST",
        body: JSON.stringify({
          order_id: "order-1",
          payer_id: "payer-1",
        }),
      });

      await POST(request);

      expect(mockStatusEventInsert).toHaveBeenCalledWith({
        pa_request_id: "pa-1",
        status: "draft",
        note: "PA request created",
        actor: "user-1",
      });
    });

    it("succeeds even if status event creation fails", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validatePaRequestCreate } = await import("@web/lib/validation");

      vi.mocked(validatePaRequestCreate).mockReturnValue({
        success: true,
        data: {
          order_id: "order-1",
          payer_id: "payer-1",
          priority: "standard",
        },
      });

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "pa_request") {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "pa-1",
                  org_id: "org-1",
                  order_id: "order-1",
                  payer_id: "payer-1",
                  status: "draft",
                  priority: "standard",
                  created_by: "user-1",
                },
                error: null,
              }),
            };
          }
          if (table === "status_event") {
            return {
              insert: vi.fn().mockResolvedValue({
                error: { message: "Status event insert failed" },
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/pa-requests", {
        method: "POST",
        body: JSON.stringify({
          order_id: "order-1",
          payer_id: "payer-1",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
    });

    it("returns 400 when validation fails", async () => {
      const { validatePaRequestCreate } = await import("@web/lib/validation");

      vi.mocked(validatePaRequestCreate).mockReturnValue({
        success: false,
        error: "Field is required",
        issues: ["order_id: Field is required"],
      });

      const request = new NextRequest("http://localhost:3000/api/pa-requests", {
        method: "POST",
        body: JSON.stringify({
          payer_id: "payer-1",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Field is required");
    });

    it("returns 401 when user is not authenticated", async () => {
      const { getOrgContext, HttpError } = await import(
        "@web/app/api/_lib/org"
      );
      const { validatePaRequestCreate } = await import("@web/lib/validation");

      vi.mocked(validatePaRequestCreate).mockReturnValue({
        success: true,
        data: {
          order_id: "order-1",
          payer_id: "payer-1",
          priority: "standard",
        },
      });

      vi.mocked(getOrgContext).mockRejectedValue(
        new HttpError(401, "Unauthorized")
      );

      const request = new NextRequest("http://localhost:3000/api/pa-requests", {
        method: "POST",
        body: JSON.stringify({
          order_id: "order-1",
          payer_id: "payer-1",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 403 when database returns access error", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validatePaRequestCreate } = await import("@web/lib/validation");

      vi.mocked(validatePaRequestCreate).mockReturnValue({
        success: true,
        data: {
          order_id: "order-1",
          payer_id: "payer-1",
          priority: "standard",
        },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "access denied" },
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/pa-requests", {
        method: "POST",
        body: JSON.stringify({
          order_id: "order-1",
          payer_id: "payer-1",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it("returns 500 when database insert fails", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validatePaRequestCreate } = await import("@web/lib/validation");

      vi.mocked(validatePaRequestCreate).mockReturnValue({
        success: true,
        data: {
          order_id: "order-1",
          payer_id: "payer-1",
          priority: "standard",
        },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/pa-requests", {
        method: "POST",
        body: JSON.stringify({
          order_id: "order-1",
          payer_id: "payer-1",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  });
});
