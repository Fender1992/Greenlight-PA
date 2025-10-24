/**
 * Organization profile API
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import type { Database } from "@greenlight/db/types/database";
import {
  HttpError,
  requireUser,
  resolveOrgId,
  requireOrgAdmin,
} from "../_lib/org";

type OrgUpdate = Database["public"]["Tables"]["org"]["Update"];

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireUser(request);
    const { searchParams } = new URL(request.url);
    // Allow ambiguous for GET (read operations are less risky)
    const orgId = await resolveOrgId(user, searchParams.get("org_id"), {
      allowAmbiguous: true,
    });

    const { data, error } = await supabaseAdmin
      .from("org")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error) {
      throw new HttpError(500, error.message);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Org fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load organization",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json();

    // Try to get org_id from query params, or from body
    const orgIdParam = searchParams.get("org_id") || body.org_id || null;
    const { orgId } = await requireOrgAdmin(request, orgIdParam);

    const updates: OrgUpdate = {
      name: body.name,
      npi: body.npi ?? null,
      address: body.address ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("org")
      .update(updates)
      .eq("id", orgId)
      .select()
      .single();

    if (error) {
      throw new HttpError(500, error.message);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Org update error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update organization",
      },
      { status: 500 }
    );
  }
}
