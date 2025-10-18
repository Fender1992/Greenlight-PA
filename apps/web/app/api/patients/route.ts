/**
 * Patient API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { getPatientsByOrg, createPatient } from "@greenlight/db";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, requireUser, resolveOrgId } from "../_lib/org";

type PatientInsert = Database["public"]["Tables"]["patient"]["Insert"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await requireUser(request);
    const orgId = await resolveOrgId(user, searchParams.get("org_id"));

    const result = await getPatientsByOrg(orgId);

    if (!result.success) {
      throw new HttpError(500, result.error);
    }

    return NextResponse.json({ success: true, data: result.data });
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
    const user = await requireUser(request);
    const body = await request.json();

    const orgId = await resolveOrgId(user, body.org_id ?? null);

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

    const result = await createPatient(patient);
    if (!result.success) {
      throw new HttpError(500, result.error);
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 }
    );
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
