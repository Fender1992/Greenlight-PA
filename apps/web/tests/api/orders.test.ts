/**
 * Tests for /api/orders route
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@web/app/api/orders/route";

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
  validateOrderCreate: vi.fn(),
}));

describe("/api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns list of orders with default pagination", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: "order-1",
              org_id: "org-1",
              patient_id: "patient-1",
              provider_id: "provider-1",
              modality: "MRI Brain",
              cpt_codes: ["70551"],
              icd10_codes: ["G89.29"],
              clinic_notes_text: "Chronic headaches",
              patient: { id: "patient-1", name: "John Doe" },
              provider: { id: "provider-1", name: "Dr. Smith" },
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

      const request = new NextRequest("http://localhost:3000/api/orders");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].modality).toBe("MRI Brain");
      expect(json.pagination).toEqual({ limit: 50, offset: 0 });
      expect(mockClient.range).toHaveBeenCalledWith(0, 49);
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
        "http://localhost:3000/api/orders?limit=25&offset=50"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.pagination).toEqual({ limit: 25, offset: 50 });
      expect(mockClient.range).toHaveBeenCalledWith(50, 74); // offset to offset+limit-1
    });

    it("enforces maximum limit of 100", async () => {
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
        "http://localhost:3000/api/orders?limit=200"
      );
      const response = await GET(request);

      const json = await response.json();
      expect(json.pagination.limit).toBe(100); // Max enforced
      expect(mockClient.range).toHaveBeenCalledWith(0, 99);
    });

    it("enforces minimum limit of 1", async () => {
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
        "http://localhost:3000/api/orders?limit=-5"
      );
      const response = await GET(request);

      const json = await response.json();
      expect(json.pagination.limit).toBe(1); // Min enforced
    });

    it("includes patient and provider relations", async () => {
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

      const request = new NextRequest("http://localhost:3000/api/orders");
      await GET(request);

      expect(mockClient.select).toHaveBeenCalledWith(
        expect.stringContaining("patient:patient_id")
      );
      expect(mockClient.select).toHaveBeenCalledWith(
        expect.stringContaining("provider:provider_id")
      );
    });

    it("orders by created_at descending", async () => {
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

      const request = new NextRequest("http://localhost:3000/api/orders");
      await GET(request);

      expect(mockClient.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });

    it("returns 401 when user is not authenticated", async () => {
      const { getOrgContext, HttpError } = await import(
        "@web/app/api/_lib/org"
      );

      vi.mocked(getOrgContext).mockRejectedValue(
        new HttpError(401, "Unauthorized")
      );

      const request = new NextRequest("http://localhost:3000/api/orders");
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

      const request = new NextRequest("http://localhost:3000/api/orders");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Database error");
    });
  });

  describe("POST", () => {
    it("creates a new order successfully", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validateOrderCreate } = await import("@web/lib/validation");

      vi.mocked(validateOrderCreate).mockReturnValue({
        success: true,
        data: {
          patient_id: "patient-1",
          provider_id: "provider-1",
          modality: "CT Chest",
          cpt_codes: ["71260"],
          icd10_codes: ["J18.9"],
          clinic_notes_text: "Suspected pneumonia",
        },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "order-1",
            org_id: "org-1",
            patient_id: "patient-1",
            provider_id: "provider-1",
            modality: "CT Chest",
            cpt_codes: ["71260"],
            icd10_codes: ["J18.9"],
            clinic_notes_text: "Suspected pneumonia",
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

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          patient_id: "patient-1",
          provider_id: "provider-1",
          modality: "CT Chest",
          cpt_codes: ["71260"],
          icd10_codes: ["J18.9"],
          clinic_notes_text: "Suspected pneumonia",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.modality).toBe("CT Chest");
      expect(json.data.id).toBe("order-1");
    });

    it("creates order with multiple codes", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validateOrderCreate } = await import("@web/lib/validation");

      vi.mocked(validateOrderCreate).mockReturnValue({
        success: true,
        data: {
          patient_id: "patient-1",
          provider_id: "provider-1",
          modality: "MRI Brain",
          cpt_codes: ["70551", "70552"],
          icd10_codes: ["G43.909", "R51.9"],
          clinic_notes_text: null,
        },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "order-2",
            org_id: "org-1",
            patient_id: "patient-1",
            provider_id: "provider-1",
            modality: "MRI Brain",
            cpt_codes: ["70551", "70552"],
            icd10_codes: ["G43.909", "R51.9"],
            clinic_notes_text: null,
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

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          patient_id: "patient-1",
          provider_id: "provider-1",
          modality: "MRI Brain",
          cpt_codes: ["70551", "70552"],
          icd10_codes: ["G43.909", "R51.9"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.cpt_codes).toHaveLength(2);
      expect(json.data.icd10_codes).toHaveLength(2);
    });

    it("returns 400 when validation fails", async () => {
      const { validateOrderCreate } = await import("@web/lib/validation");

      vi.mocked(validateOrderCreate).mockReturnValue({
        success: false,
        error: "At least one code is required",
        issues: ["cpt_codes: At least one code is required"],
      });

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          patient_id: "patient-1",
          provider_id: "provider-1",
          modality: "CT Scan",
          cpt_codes: [],
          icd10_codes: [],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("At least one code is required");
    });

    it("returns 400 when required fields are missing", async () => {
      const { validateOrderCreate } = await import("@web/lib/validation");

      vi.mocked(validateOrderCreate).mockReturnValue({
        success: false,
        error: "Field is required",
        issues: ["patient_id: Field is required"],
      });

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          modality: "MRI",
          cpt_codes: ["70551"],
          icd10_codes: ["G89.29"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it("returns 401 when user is not authenticated", async () => {
      const { getOrgContext, HttpError } = await import(
        "@web/app/api/_lib/org"
      );
      const { validateOrderCreate } = await import("@web/lib/validation");

      vi.mocked(validateOrderCreate).mockReturnValue({
        success: true,
        data: {
          patient_id: "patient-1",
          provider_id: "provider-1",
          modality: "MRI",
          cpt_codes: ["70551"],
          icd10_codes: ["G89.29"],
        },
      });

      vi.mocked(getOrgContext).mockRejectedValue(
        new HttpError(401, "Unauthorized")
      );

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          patient_id: "patient-1",
          provider_id: "provider-1",
          modality: "MRI",
          cpt_codes: ["70551"],
          icd10_codes: ["G89.29"],
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
      const { validateOrderCreate } = await import("@web/lib/validation");

      vi.mocked(validateOrderCreate).mockReturnValue({
        success: true,
        data: {
          patient_id: "patient-1",
          provider_id: "provider-1",
          modality: "MRI",
          cpt_codes: ["70551"],
          icd10_codes: ["G89.29"],
        },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "access denied to table order" },
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          patient_id: "patient-1",
          provider_id: "provider-1",
          modality: "MRI",
          cpt_codes: ["70551"],
          icd10_codes: ["G89.29"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it("returns 500 when database insert fails with other error", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validateOrderCreate } = await import("@web/lib/validation");

      vi.mocked(validateOrderCreate).mockReturnValue({
        success: true,
        data: {
          patient_id: "patient-1",
          provider_id: "provider-1",
          modality: "MRI",
          cpt_codes: ["70551"],
          icd10_codes: ["G89.29"],
        },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection lost" },
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          patient_id: "patient-1",
          provider_id: "provider-1",
          modality: "MRI",
          cpt_codes: ["70551"],
          icd10_codes: ["G89.29"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  });
});
