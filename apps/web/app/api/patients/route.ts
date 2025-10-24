/**
 * Patient API routes
 */

import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, getOrgContext } from "../_lib/org";
import { validatePatientCreate } from "@web/lib/validation";

type PatientInsert = Database["public"]["Tables"]["patient"]["Insert"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId, client } = await getOrgContext(
      request,
      searchParams.get("org_id"),
      { allowAmbiguous: true } // Allow for single-org users
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
    const validation = validatePatientCreate(body);
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

    const patient: PatientInsert = {
      org_id: orgId,
      name: validation.data.name,
      mrn: validation.data.mrn ?? null,
      dob: validation.data.dob ?? null,
      sex: validation.data.sex ?? null,
      phone: validation.data.phone ?? null,
      address: validation.data.address ?? null,
    };

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
