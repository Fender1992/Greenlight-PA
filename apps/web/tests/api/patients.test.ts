/**
 * Tests for /api/patients route
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@web/app/api/patients/route";

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
  validatePatientCreate: vi.fn(),
}));

describe("/api/patients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns list of patients for organization", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "patient-1",
              org_id: "org-1",
              name: "John Doe",
              mrn: "MRN001",
              dob: "1990-01-01",
              sex: "M",
              phone: "555-1234",
              address: "123 Main St",
            },
            {
              id: "patient-2",
              org_id: "org-1",
              name: "Jane Smith",
              mrn: "MRN002",
              dob: "1985-05-15",
              sex: "F",
              phone: null,
              address: null,
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

      const request = new NextRequest("http://localhost:3000/api/patients");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
      expect(json.data[0].name).toBe("John Doe");
      expect(mockClient.eq).toHaveBeenCalledWith("org_id", "org-1");
      expect(mockClient.order).toHaveBeenCalledWith("name", {
        ascending: true,
      });
    });

    it("respects org_id query parameter", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-2",
        role: "admin",
        client: mockClient as any,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/patients?org_id=org-2"
      );
      await GET(request);

      expect(getOrgContext).toHaveBeenCalledWith(
        expect.any(NextRequest),
        "org-2",
        { allowAmbiguous: true }
      );
    });

    it("returns 401 when user is not authenticated", async () => {
      const { getOrgContext, HttpError } = await import(
        "@web/app/api/_lib/org"
      );

      vi.mocked(getOrgContext).mockRejectedValue(
        new HttpError(401, "Unauthorized")
      );

      const request = new NextRequest("http://localhost:3000/api/patients");
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
        order: vi.fn().mockResolvedValue({
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

      const request = new NextRequest("http://localhost:3000/api/patients");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Database connection failed");
    });
  });

  describe("POST", () => {
    it("creates a new patient successfully", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validatePatientCreate } = await import("@web/lib/validation");

      vi.mocked(validatePatientCreate).mockReturnValue({
        success: true,
        data: {
          name: "Alice Johnson",
          mrn: "MRN003",
          dob: "1995-03-20",
          sex: "F",
          phone: "555-9876",
          address: "456 Oak Ave",
        },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "patient-3",
            org_id: "org-1",
            name: "Alice Johnson",
            mrn: "MRN003",
            dob: "1995-03-20",
            sex: "F",
            phone: "555-9876",
            address: "456 Oak Ave",
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

      const request = new NextRequest("http://localhost:3000/api/patients", {
        method: "POST",
        body: JSON.stringify({
          name: "Alice Johnson",
          mrn: "MRN003",
          dob: "1995-03-20",
          sex: "F",
          phone: "555-9876",
          address: "456 Oak Ave",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Alice Johnson");
      expect(json.data.id).toBe("patient-3");
    });

    it("creates patient with minimal required fields", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validatePatientCreate } = await import("@web/lib/validation");

      vi.mocked(validatePatientCreate).mockReturnValue({
        success: true,
        data: {
          name: "Bob Wilson",
          mrn: null,
          dob: null,
          sex: null,
          phone: null,
          address: null,
        },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "patient-4",
            org_id: "org-1",
            name: "Bob Wilson",
            mrn: null,
            dob: null,
            sex: null,
            phone: null,
            address: null,
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

      const request = new NextRequest("http://localhost:3000/api/patients", {
        method: "POST",
        body: JSON.stringify({ name: "Bob Wilson" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Bob Wilson");
      expect(mockClient.insert).toHaveBeenCalledWith({
        org_id: "org-1",
        name: "Bob Wilson",
        mrn: null,
        dob: null,
        sex: null,
        phone: null,
        address: null,
      });
    });

    it("returns 400 when validation fails", async () => {
      const { validatePatientCreate } = await import("@web/lib/validation");

      vi.mocked(validatePatientCreate).mockReturnValue({
        success: false,
        error: "Field cannot be empty",
        issues: ["name: Field cannot be empty"],
      });

      const request = new NextRequest("http://localhost:3000/api/patients", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Field cannot be empty");
      expect(json.issues).toEqual(["name: Field cannot be empty"]);
    });

    it("returns 400 when name is missing", async () => {
      const { validatePatientCreate } = await import("@web/lib/validation");

      vi.mocked(validatePatientCreate).mockReturnValue({
        success: false,
        error: "Field is required",
        issues: ["name: Field is required"],
      });

      const request = new NextRequest("http://localhost:3000/api/patients", {
        method: "POST",
        body: JSON.stringify({ mrn: "MRN001" }),
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
      const { validatePatientCreate } = await import("@web/lib/validation");

      vi.mocked(validatePatientCreate).mockReturnValue({
        success: true,
        data: { name: "Test Patient" },
      });

      vi.mocked(getOrgContext).mockRejectedValue(
        new HttpError(401, "Unauthorized")
      );

      const request = new NextRequest("http://localhost:3000/api/patients", {
        method: "POST",
        body: JSON.stringify({ name: "Test Patient" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 500 when database insert fails", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validatePatientCreate } = await import("@web/lib/validation");

      vi.mocked(validatePatientCreate).mockReturnValue({
        success: true,
        data: { name: "Test Patient" },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Unique constraint violation" },
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-1",
        role: "staff",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/patients", {
        method: "POST",
        body: JSON.stringify({ name: "Test Patient" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unique constraint violation");
    });

    it("resolves org_id from body when provided", async () => {
      const { getOrgContext } = await import("@web/app/api/_lib/org");
      const { validatePatientCreate } = await import("@web/lib/validation");

      vi.mocked(validatePatientCreate).mockReturnValue({
        success: true,
        data: {
          name: "Test Patient",
          org_id: "org-2",
        },
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "patient-5",
            org_id: "org-2",
            name: "Test Patient",
          },
          error: null,
        }),
      };

      vi.mocked(getOrgContext).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
        orgId: "org-2",
        role: "admin",
        client: mockClient as any,
      });

      const request = new NextRequest("http://localhost:3000/api/patients", {
        method: "POST",
        body: JSON.stringify({ name: "Test Patient", org_id: "org-2" }),
      });

      await POST(request);

      expect(getOrgContext).toHaveBeenCalled();
      const callArgs = vi.mocked(getOrgContext).mock.calls[0];
      expect(callArgs[1]).toBe("org-2");
      expect(callArgs[2]).toBeUndefined();
    });
  });
});
