/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Single PA Request | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@greenlight/db/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError, getScopedClient, requireUser } from "../../_lib/org";
import { sendEmailNotification } from "@greenlight/email";
import { supabaseAdmin } from "@greenlight/db";

type PaRequestRow = Database["public"]["Tables"]["pa_request"]["Row"];
type OrderRow = Database["public"]["Tables"]["order"]["Row"];
type PatientRow = Database["public"]["Tables"]["patient"]["Row"];
type ProviderRow = Database["public"]["Tables"]["provider"]["Row"];
type PayerRow = Database["public"]["Tables"]["payer"]["Row"];
type ChecklistItemRow =
  Database["public"]["Tables"]["pa_checklist_item"]["Row"];
type AttachmentRow = Database["public"]["Tables"]["attachment"]["Row"];
type PaSummaryRow = Database["public"]["Tables"]["pa_summary"]["Row"];
type StatusEventRow = Database["public"]["Tables"]["status_event"]["Row"];
type PolicySnippetRow = Database["public"]["Tables"]["policy_snippet"]["Row"];

type ChecklistItemWithAttachment = ChecklistItemRow & {
  evidence_attachment?: AttachmentRow | null;
};

type OrderWithRelations = OrderRow & {
  patient: PatientRow | null;
  provider: ProviderRow | null;
};

type PaRequestWithDetails = PaRequestRow & {
  order: OrderWithRelations | null;
  payer: PayerRow | null;
  checklist_items?: ChecklistItemWithAttachment[] | null;
  summaries?: PaSummaryRow[] | null;
  status_events?: StatusEventRow[] | null;
};

type PaRequestUpdate = Partial<Pick<PaRequestRow, "priority">>;

const PRIORITIES: ReadonlyArray<PaRequestRow["priority"]> = [
  "standard",
  "urgent",
];

type ScopedClient = SupabaseClient<Database>;

async function fetchPaRequestWithDetails(client: ScopedClient, id: string) {
  return client
    .from("pa_request")
    .select(
      `
      *,
      order:order_id(
        *,
        patient:patient_id(*),
        provider:provider_id(*)
      ),
      payer:payer_id(*),
      checklist_items:pa_checklist_item(
        *,
        evidence_attachment:evidence_attachment_id(*)
      ),
      summaries:pa_summary(*),
      status_events:status_event(*)
    `
    )
    .eq("id", id)
    .single();
}

async function buildPaResponse(
  client: ScopedClient,
  pa: PaRequestWithDetails
): Promise<
  PaRequestWithDetails & {
    attachments: AttachmentRow[];
    policy_snippets: PolicySnippetRow[];
  }
> {
  const { data: attachments } = await client
    .from("attachment")
    .select("*")
    .eq("org_id", pa.org_id)
    .order("created_at", { ascending: false });

  const modality = pa.order?.modality ?? undefined;
  const payerId = pa.payer_id ?? null;
  const cptCodes = Array.isArray(pa.order?.cpt_codes)
    ? (pa.order?.cpt_codes as string[])
    : [];

  const policySnippets: PolicySnippetRow[] = [];

  if (payerId && modality) {
    const { data } = await client
      .from("policy_snippet")
      .select("*")
      .eq("payer_id", payerId)
      .ilike("modality", `%${modality}%`);
    if (data) {
      policySnippets.push(...data);
    }
  }

  for (const code of cptCodes) {
    const { data } = await client
      .from("policy_snippet")
      .select("*")
      .eq("cpt_code", code);
    if (data) {
      policySnippets.push(...data);
    }
  }

  const uniqueSnippets = Array.from(
    new Map(policySnippets.map((snippet) => [snippet.id, snippet])).values()
  );

  return {
    ...pa,
    attachments: attachments ?? [],
    policy_snippets: uniqueSnippets,
  };
}

/**
 * GET /api/pa-requests/[id]
 * Get single PA request with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { token } = await requireUser(request);
    const client = getScopedClient(token);

    const { data, error } = await fetchPaRequestWithDetails(client, id);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "PA request not found" },
          { status: 404 }
        );
      }
      throw new HttpError(500, error.message);
    }

    const enriched = await buildPaResponse(
      client,
      data as unknown as PaRequestWithDetails
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("PA request get error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pa-requests/[id]
 * Update PA request (status or fields)
 *
 * Body:
 * {
 *   status?: pa_status,
 *   note?: string,  // for status changes
 *   priority?: 'standard' | 'urgent'
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      status,
      note,
      priority,
    }: {
      status?: string;
      note?: string;
      priority?: PaRequestRow["priority"];
    } = body;

    const { user, token } = await requireUser(request);
    const client = getScopedClient(token);

    const { data: paRecord, error: fetchError } = await client
      .from("pa_request")
      .select("org_id")
      .eq("id", id)
      .single();

    if (fetchError || !paRecord) {
      throw new HttpError(404, "PA request not found");
    }

    // If status is being updated, handle via scoped client
    if (status) {
      const { error: statusError } = await client
        .from("pa_request")
        .update({ status })
        .eq("id", id)
        .select("id")
        .single();

      if (statusError) {
        throw new HttpError(
          500,
          statusError?.message || "Status update failed"
        );
      }

      const { error: eventError } = await client.from("status_event").insert({
        pa_request_id: id,
        status,
        note,
        actor: user.id,
      });

      if (eventError) {
        console.error("Failed to create status event:", eventError);
      }

      const { data: refreshed, error: refetchError } =
        await fetchPaRequestWithDetails(client, id);

      if (refetchError || !refreshed) {
        throw new HttpError(
          500,
          refetchError?.message || "Failed to load PA request"
        );
      }

      // Send email notification for status change (non-blocking)
      // Only send for important status changes
      if (
        ["submitted", "approved", "denied", "pending_info"].includes(status)
      ) {
        const paData = refreshed as unknown as PaRequestWithDetails;

        // Get creator email if available
        if (paData.created_by) {
          supabaseAdmin.auth.admin
            .getUserById(paData.created_by)
            .then(({ data: userData }) => {
              if (userData.user?.email && paData.order?.patient) {
                sendEmailNotification({
                  to: userData.user.email,
                  type: "pa_status_changed",
                  data: {
                    patientName: paData.order.patient.name,
                    orderId: paData.order_id,
                    status,
                    note,
                    paRequestId: id,
                    appUrl:
                      process.env.NEXT_PUBLIC_APP_URL ||
                      "http://localhost:3000",
                  },
                }).catch((err) => {
                  console.error("Failed to send PA status email:", err);
                });
              }
            })
            .catch((err) => {
              console.error("Failed to fetch user for email:", err);
            });
        }
      }

      const enriched = await buildPaResponse(
        client,
        refreshed as unknown as PaRequestWithDetails
      );
      return NextResponse.json({ success: true, data: enriched });
    }

    // Otherwise, update other fields directly
    const updates: PaRequestUpdate = {};
    if (priority) {
      if (!PRIORITIES.includes(priority)) {
        return NextResponse.json(
          { success: false, error: "Invalid priority value" },
          { status: 400 }
        );
      }
      updates.priority = priority;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { error } = await client
      .from("pa_request")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const { data: refreshed, error: refetchError } =
      await fetchPaRequestWithDetails(client, id);

    if (refetchError || !refreshed) {
      throw new HttpError(
        500,
        refetchError?.message || "Failed to load PA request"
      );
    }

    const enriched = await buildPaResponse(
      client,
      refreshed as unknown as PaRequestWithDetails
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("PA request update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pa-requests/[id]
 * Delete PA request (cascade deletes related data)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { token } = await requireUser(request);
    const client = getScopedClient(token);

    const { data: deleted, error } = await client
      .from("pa_request")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "PA request not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: deleted?.id ?? id, deleted: true },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("PA request delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
