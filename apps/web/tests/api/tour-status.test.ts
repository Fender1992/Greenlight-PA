/**
 * Tests for /api/member/tour-status endpoint
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GET,
  POST,
  PUT,
  DELETE,
  PATCH,
} from "@web/app/api/member/tour-status/route";

// Mock the org module
vi.mock("@web/app/api/_lib/org", () => ({
  requireUser: vi.fn(),
  getScopedClient: vi.fn(),
}));

describe("/api/member/tour-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Method validation", () => {
    it("rejects PUT requests with 405", async () => {
      const response = await PUT();
      expect(response.status).toBe(405);

      const json = await response.json();
      expect(json.error).toBe("Method not allowed");
    });

    it("rejects DELETE requests with 405", async () => {
      const response = await DELETE();
      expect(response.status).toBe(405);

      const json = await response.json();
      expect(json.error).toBe("Method not allowed");
    });

    it("rejects PATCH requests with 405", async () => {
      const response = await PATCH();
      expect(response.status).toBe(405);

      const json = await response.json();
      expect(json.error).toBe("Method not allowed");
    });

    it("includes Allow header in 405 responses", async () => {
      const response = await PUT();
      expect(response.headers.get("Allow")).toBe("GET, POST");
    });
  });

  describe("GET endpoint", () => {
    it("returns 401 when user is not authenticated", async () => {
      const { requireUser } = await import("@web/app/api/_lib/org");
      vi.mocked(requireUser).mockRejectedValue(new Error("unauthorized"));

      const req = new NextRequest(
        "http://localhost:3000/api/member/tour-status"
      );
      const response = await GET(req);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns false when member record not found (PGRST116)", async () => {
      const { requireUser, getScopedClient } = await import(
        "@web/app/api/_lib/org"
      );

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      };

      vi.mocked(getScopedClient).mockReturnValue(mockClient as any);

      const req = new NextRequest(
        "http://localhost:3000/api/member/tour-status"
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.has_seen_tour).toBe(false);
    });

    it("returns member tour status when found", async () => {
      const { requireUser, getScopedClient } = await import(
        "@web/app/api/_lib/org"
      );

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { has_seen_tour: true },
          error: null,
        }),
      };

      vi.mocked(getScopedClient).mockReturnValue(mockClient as any);

      const req = new NextRequest(
        "http://localhost:3000/api/member/tour-status"
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.has_seen_tour).toBe(true);
    });
  });

  describe("POST endpoint", () => {
    it("returns 401 when user is not authenticated", async () => {
      const { requireUser } = await import("@web/app/api/_lib/org");
      vi.mocked(requireUser).mockRejectedValue(new Error("unauthorized"));

      const req = new NextRequest(
        "http://localhost:3000/api/member/tour-status",
        {
          method: "POST",
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("updates tour status successfully", async () => {
      const { requireUser, getScopedClient } = await import(
        "@web/app/api/_lib/org"
      );

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      vi.mocked(getScopedClient).mockReturnValue(mockClient as any);

      const req = new NextRequest(
        "http://localhost:3000/api/member/tour-status",
        {
          method: "POST",
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe("Tour status updated successfully");

      // Verify the update was called correctly
      expect(mockClient.update).toHaveBeenCalledWith({ has_seen_tour: true });
      expect(mockClient.eq).toHaveBeenCalledWith("user_id", "user-1");
    });

    it("returns 500 when update fails", async () => {
      const { requireUser, getScopedClient } = await import(
        "@web/app/api/_lib/org"
      );

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" } as any,
        token: "token-123",
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { message: "Database error" },
        }),
      };

      vi.mocked(getScopedClient).mockReturnValue(mockClient as any);

      const req = new NextRequest(
        "http://localhost:3000/api/member/tour-status",
        {
          method: "POST",
        }
      );
      const response = await POST(req);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("Failed to update tour status");
    });
  });
});
