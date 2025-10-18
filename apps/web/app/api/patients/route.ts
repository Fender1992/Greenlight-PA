/**
 * Patient API routes
 */

import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, getOrgContext } from "../_lib/org";

type PatientInsert = Database["public"]["Tables"]["patient"]["Insert"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId, client } = await getOrgContext(
      request,
      searchParams.get("org_id")
    );

    const { data, error } = await client
      .from("patient")
      .select("*")
      .eq("org_id", orgId)
      .order("name", { ascending: true });

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

    console.error("Patient list error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch patients",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, client } = await getOrgContext(request, body.org_id ?? null);

    const patient: PatientInsert = {
      org_id: orgId,
      name: body.name,
      mrn: body.mrn ?? null,
      dob: body.dob ?? null,
      sex: body.sex ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
    };

    if (!patient.name) {
      throw new HttpError(400, "Patient name is required");
    }

    const { data, error } = await client
      .from("patient")
      .insert(patient)
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

    console.error("Patient creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create patient",
      },
      { status: 500 }
    );
  }
}
