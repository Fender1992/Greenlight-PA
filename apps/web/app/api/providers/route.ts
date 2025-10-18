/**
 * Provider directory API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, getOrgContext } from "../_lib/org";

type ProviderInsert = Database["public"]["Tables"]["provider"]["Insert"];
type ProviderUpdate = Database["public"]["Tables"]["provider"]["Update"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId } = await getOrgContext(request, searchParams.get("org_id"));
    const search = searchParams.get("q")?.toLowerCase() ?? "";

    let query = supabaseAdmin
      .from("provider")
      .select("*")
      .eq("org_id", orgId)
      .order("name");

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;
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

    console.error("Provider list error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch providers",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId } = await getOrgContext(request, body.org_id ?? null);

    if (!body.name) {
      throw new HttpError(400, "Provider name is required");
    }

    const payload: ProviderInsert = {
      org_id: orgId,
      name: body.name,
      npi: body.npi ?? null,
      specialty: body.specialty ?? null,
      location: body.location ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("provider")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new HttpError(500, error.message);
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Provider creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create provider",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId } = await getOrgContext(request, body.org_id ?? null);
    const id = body.id as string | undefined;
    if (!id) {
      throw new HttpError(400, "Provider id is required");
    }

    const updates: ProviderUpdate = {
      org_id: orgId,
      name: body.name,
      npi: body.npi ?? null,
      specialty: body.specialty ?? null,
      location: body.location ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("provider")
      .update(updates)
      .eq("id", id)
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

    console.error("Provider update error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update provider",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId } = await getOrgContext(request, null);
    const id = searchParams.get("id");

    if (!id) {
      throw new HttpError(400, "Provider id is required");
    }

    const { error } = await supabaseAdmin
      .from("provider")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) {
      throw new HttpError(500, error.message);
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Provider delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete provider",
      },
      { status: 500 }
    );
  }
}
