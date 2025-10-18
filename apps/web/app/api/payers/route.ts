/**
 * Payer directory API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@greenlight/db";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, requireUser } from "../_lib/org";

type PayerInsert = Database["public"]["Tables"]["payer"]["Insert"];
type PayerUpdate = Database["public"]["Tables"]["payer"]["Update"];

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.toLowerCase() ?? "";

    let query = supabase.from("payer").select("*").order("name");
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

    console.error("Payer list error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch payers",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);
    const body = await request.json();

    if (!body.name) {
      throw new HttpError(400, "Payer name is required");
    }

    const payer: PayerInsert = {
      name: body.name,
      portal_url: body.portal_url ?? null,
      contact: body.contact ?? null,
      policy_links: Array.isArray(body.policy_links) ? body.policy_links : [],
    };

    const { data, error } = await supabase
      .from("payer")
      .insert(payer)
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

    console.error("Payer creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create payer",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireUser(request);
    const body = await request.json();
    const id = body.id as string | undefined;
    if (!id) {
      throw new HttpError(400, "Payer id is required");
    }

    const updates: PayerUpdate = {
      name: body.name,
      portal_url: body.portal_url ?? null,
      contact: body.contact ?? null,
      policy_links: Array.isArray(body.policy_links)
        ? body.policy_links
        : undefined,
    };

    const { data, error } = await supabase
      .from("payer")
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

    console.error("Payer update error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update payer",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw new HttpError(400, "Payer id is required");
    }

    const { error } = await supabase.from("payer").delete().eq("id", id);
    if (error) {
      throw new HttpError(500, error.message);
    }

    return NextResponse.json({
      success: true,
      data: { id, deleted_by: user.id },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Payer delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete payer",
      },
      { status: 500 }
    );
  }
}
