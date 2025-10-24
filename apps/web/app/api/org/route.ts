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
    const orgId = await resolveOrgId(user, null);

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
    const { orgId } = await requireOrgAdmin(request, null);
    const body = await request.json();

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
