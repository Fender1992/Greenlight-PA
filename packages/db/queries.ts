/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/db/queries | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import {
  supabase,
  supabaseAdmin,
  getCurrentUser,
  getUserOrgIds,
} from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types/database";

type Tables = Database["public"]["Tables"];

/**
 * RLS-Safe Query Result
 */
export type QueryResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

/**
 * RLS Guard: Ensures user has access to the org
 */
export async function guardOrgAccess(
  orgId: string
): Promise<QueryResult<boolean>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, data: null, error: "User not authenticated" };
  }

  const orgIds = await getUserOrgIds(user.id);
  if (!orgIds.includes(orgId)) {
    return {
      success: false,
      data: null,
      error: "User does not have access to this organization",
    };
  }

  return { success: true, data: true, error: null };
}

/**
 * ============================================================================
 * PATIENT QUERIES (RLS-Protected)
 * ============================================================================
 */

export async function getPatientsByOrg(orgId: string) {
  const guard = await guardOrgAccess(orgId);
  if (!guard.success) return guard;

  const { data, error } = await supabase
    .from("patient")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

export async function getPatientById(patientId: string) {
  const { data, error } = await supabase
    .from("patient")
    .select("*")
    .eq("id", patientId)
    .single();

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

export async function createPatient(patient: Tables["patient"]["Insert"]) {
  const guard = await guardOrgAccess(patient.org_id);
  if (!guard.success) return guard;

  const { data, error } = await supabase
    .from("patient")
    .insert(patient)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

/**
 * ============================================================================
 * ORDER QUERIES (RLS-Protected)
 * ============================================================================
 */

export async function getOrdersByOrg(orgId: string) {
  const guard = await guardOrgAccess(orgId);
  if (!guard.success) return guard;

  const { data, error } = await supabase
    .from("order")
    .select(
      `
      *,
      patient:patient_id(*),
      provider:provider_id(*)
    `
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

export async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from("order")
    .select(
      `
      *,
      patient:patient_id(*),
      provider:provider_id(*)
    `
    )
    .eq("id", orderId)
    .single();

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

export async function createOrder(order: Tables["order"]["Insert"]) {
  const guard = await guardOrgAccess(order.org_id);
  if (!guard.success) return guard;

  const { data, error } = await supabase
    .from("order")
    .insert(order)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

/**
 * ============================================================================
 * PA REQUEST QUERIES (RLS-Protected)
 * ============================================================================
 */

export async function getPARequestsByOrg(
  orgId: string,
  filters?: { status?: string; patientId?: string }
) {
  const guard = await guardOrgAccess(orgId);
  if (!guard.success) return guard;

  let query = supabase
    .from("pa_request")
    .select(
      `
      *,
      order:order_id(
        *,
        patient:patient_id(*),
        provider:provider_id(*)
      ),
      payer:payer_id(*)
    `
    )
    .eq("org_id", orgId);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  // Filter by patient if needed (client-side since it's nested)
  let filteredData = data;
  if (filters?.patientId && data) {
    filteredData = data.filter(
      (pa) => (pa.order as any)?.patient_id === filters.patientId
    );
  }

  return { success: true, data: filteredData, error: null } as const;
}

export async function getPARequestById(paId: string) {
  const { data, error } = await supabase
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
    .eq("id", paId)
    .single();

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  // Also fetch all attachments for this PA request's organization
  // (in case there are attachments not yet linked to checklist items)
  const { data: attachments } = await supabase
    .from("attachment")
    .select("*")
    .eq("org_id", data.org_id)
    .order("created_at", { ascending: false });

  // Fetch relevant policy snippets based on payer, modality, and CPT codes
  const policySnippetsPromises = [];

  // Get snippets for the payer + modality
  if (data.payer_id && (data.order as any)?.modality) {
    policySnippetsPromises.push(
      supabase
        .from("policy_snippet")
        .select("*")
        .eq("payer_id", data.payer_id)
        .ilike("modality", `%${(data.order as any).modality}%`)
    );
  }

  // Get snippets for CPT codes
  const cptCodes = ((data.order as any)?.cpt_codes ?? []) as string[];
  for (const cptCode of cptCodes) {
    policySnippetsPromises.push(
      supabase.from("policy_snippet").select("*").eq("cpt_code", cptCode)
    );
  }

  const snippetResults = await Promise.all(policySnippetsPromises);
  const allSnippets = snippetResults
    .filter((result) => result.data)
    .flatMap((result) => result.data ?? []);

  // Deduplicate snippets by ID
  const uniqueSnippets = Array.from(
    new Map(allSnippets.map((s) => [s.id, s])).values()
  );

  const result = {
    ...data,
    attachments: attachments ?? [],
    policy_snippets: uniqueSnippets,
  };

  return { success: true, data: result, error: null } as const;
}

export async function createPARequest(
  paRequest: Tables["pa_request"]["Insert"]
) {
  const guard = await guardOrgAccess(paRequest.org_id);
  if (!guard.success) return guard;

  const user = await getCurrentUser();
  const requestWithCreator = {
    ...paRequest,
    created_by: user?.id || null,
  };

  const { data, error } = await supabase
    .from("pa_request")
    .insert(requestWithCreator)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

export async function updatePARequestStatus(
  client: SupabaseClient<Database>,
  paId: string,
  status: Database["public"]["Enums"]["pa_status"],
  note?: string,
  actorId?: string | null
) {
  // Update PA request status
  const { data: paData, error: paError } = await client
    .from("pa_request")
    .update({ status })
    .eq("id", paId)
    .select()
    .single();

  if (paError) {
    return { success: false, data: null, error: paError.message } as const;
  }

  // Create status event
  const { error: eventError } = await client.from("status_event").insert({
    pa_request_id: paId,
    status,
    note,
    actor: actorId ?? null,
  });

  if (eventError) {
    console.error("Failed to create status event:", eventError);
  }

  return { success: true, data: paData, error: null } as const;
}

/**
 * ============================================================================
 * CHECKLIST QUERIES (RLS-Protected via pa_request)
 * ============================================================================
 */

export async function getChecklistItemsForPA(paId: string) {
  const { data, error } = await supabase
    .from("pa_checklist_item")
    .select("*")
    .eq("pa_request_id", paId)
    .order("created_at");

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

export async function createChecklistItem(
  item: Tables["pa_checklist_item"]["Insert"]
) {
  const { data, error } = await supabase
    .from("pa_checklist_item")
    .insert(item)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

export async function updateChecklistItem(
  itemId: string,
  updates: Tables["pa_checklist_item"]["Update"]
) {
  const { data, error } = await supabase
    .from("pa_checklist_item")
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

/**
 * ============================================================================
 * PAYER QUERIES (Shared reference data)
 * ============================================================================
 */

export async function getAllPayers() {
  const { data, error } = await supabase
    .from("payer")
    .select("*")
    .order("name");

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

export async function getPayerById(payerId: string) {
  const { data, error } = await supabase
    .from("payer")
    .select("*")
    .eq("id", payerId)
    .single();

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

/**
 * ============================================================================
 * POLICY SNIPPET QUERIES (Shared reference data)
 * ============================================================================
 */

export async function getPolicySnippets(filters: {
  payerId?: string;
  modality?: string;
  cptCode?: string;
}) {
  let query = supabase.from("policy_snippet").select("*");

  if (filters.payerId) {
    query = query.eq("payer_id", filters.payerId);
  }
  if (filters.modality) {
    query = query.ilike("modality", `%${filters.modality}%`);
  }
  if (filters.cptCode) {
    query = query.eq("cpt_code", filters.cptCode);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

/**
 * ============================================================================
 * AUDIT LOG (Admin only via service role)
 * ============================================================================
 */

export async function createAuditLog(entry: Tables["audit_log"]["Insert"]) {
  if (!supabaseAdmin) {
    return {
      success: false,
      data: null,
      error: "Admin client not configured",
    } as const;
  }

  const { data, error } = await supabaseAdmin
    .from("audit_log")
    .insert(entry)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}

export async function getAuditLogsByOrg(orgId: string) {
  const guard = await guardOrgAccess(orgId);
  if (!guard.success) return guard;

  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("org_id", orgId)
    .order("at", { ascending: false })
    .limit(100);

  if (error) {
    return { success: false, data: null, error: error.message } as const;
  }

  return { success: true, data, error: null } as const;
}
