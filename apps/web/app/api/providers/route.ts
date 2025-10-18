/**
 * Provider directory API routes
 */

import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, getOrgContext } from "../_lib/org";
import {
  validateProviderCreate,
  validateProviderUpdate,
} from "@web/lib/validation";

type ProviderInsert = Database["public"]["Tables"]["provider"]["Insert"];
type ProviderUpdate = Database["public"]["Tables"]["provider"]["Update"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId, client } = await getOrgContext(
      request,
      searchParams.get("org_id")
    );
    const search = searchParams.get("q")?.toLowerCase() ?? "";

    let query = client
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
    const validation = validateProviderCreate(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error, issues: validation.issues },
        { status: 400 }
      );
    }

    const { orgId, client } = await getOrgContext(
      request,
      validation.data.org_id ?? null
    );

    const payload: ProviderInsert = {
      org_id: orgId,
      name: validation.data.name,
      npi: validation.data.npi ?? null,
      specialty: validation.data.specialty ?? null,
      location: validation.data.location ?? null,
    };

    const { data, error } = await client
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
    const validation = validateProviderUpdate(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error, issues: validation.issues },
        { status: 400 }
      );
    }

    const { orgId, client } = await getOrgContext(
      request,
      validation.data.org_id ?? null
    );

    const updates: ProviderUpdate = {
      org_id: orgId,
      name: validation.data.name,
      npi: validation.data.npi ?? null,
      specialty: validation.data.specialty ?? null,
      location: validation.data.location ?? null,
    };

    const { data, error } = await client
      .from("provider")
      .update(updates)
      .eq("id", validation.data.id)
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
    const { orgId, client } = await getOrgContext(request, null);
    const id = searchParams.get("id");

    if (!id) {
      throw new HttpError(400, "Provider id is required");
    }

    const { error } = await client
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
