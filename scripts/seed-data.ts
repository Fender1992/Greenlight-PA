#!/usr/bin/env tsx
/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Script: Seed Test Data | Status: Active | Created: 2025-10-20
 *
 * Seeds comprehensive test data for Greenlight PA application
 * Includes patients, providers, payers, orders, PA requests, policy snippets,
 * checklist items, and attachments
 *
 * Usage:
 *   tsx scripts/seed-data.ts                    # Interactive mode with confirmation
 *   CONFIRM=yes tsx scripts/seed-data.ts        # Non-interactive mode
 *   USERS_ONLY=yes tsx scripts/seed-data.ts     # Only seed users and orgs (for testing signup)
 */

import { supabaseAdmin } from "@greenlight/db";

const CONFIRM = process.env.CONFIRM === "yes";
const USERS_ONLY = process.env.USERS_ONLY === "yes";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

async function promptConfirmation(): Promise<boolean> {
  if (CONFIRM) return true;

  console.log(
    `\n${colors.yellow}⚠️  WARNING: This will insert test data into your Supabase database${colors.reset}`
  );
  console.log(
    `${colors.cyan}This is safe for development but should not be run in production${colors.reset}\n`
  );

  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(
      `Type ${colors.green}SEED DATA${colors.reset} to continue: `,
      (answer: string) => {
        readline.close();
        resolve(answer === "SEED DATA");
      }
    );
  });
}

async function seedPayers() {
  console.log(`\n${colors.blue}📋 Seeding payers...${colors.reset}`);

  const payers = [
    {
      name: "BlueCross BlueShield",
      prior_auth_required: true,
      typical_turnaround_days: 3,
    },
    {
      name: "Aetna",
      prior_auth_required: true,
      typical_turnaround_days: 5,
    },
    {
      name: "UnitedHealthcare",
      prior_auth_required: true,
      typical_turnaround_days: 2,
    },
    {
      name: "Cigna",
      prior_auth_required: true,
      typical_turnaround_days: 4,
    },
    {
      name: "Medicare",
      prior_auth_required: false,
      typical_turnaround_days: 7,
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("payer")
    .insert(payers)
    .select();

  if (error) {
    console.log(
      `${colors.red}❌ Error seeding payers: ${error.message}${colors.reset}`
    );
    throw error;
  }

  console.log(`${colors.green}✅ Seeded ${data.length} payers${colors.reset}`);
  return data;
}

async function seedPolicySnippets(payerIds: string[]) {
  console.log(`\n${colors.blue}📚 Seeding policy snippets...${colors.reset}`);

  const snippets = [
    {
      payer_id: payerIds[0], // BCBS
      modality: "MRI Brain",
      cpt_codes: ["70551", "70552", "70553"],
      icd10_codes: ["G89.29", "R51.9"],
      requirement_text:
        "Prior authorization required for MRI Brain. Must document: 1) Persistent headaches not responding to conservative therapy for 6+ weeks, 2) Neurological exam findings, 3) Previous imaging if available.",
      approval_criteria:
        "Approved if clinical documentation supports medical necessity and conservative treatments have been attempted.",
      source_url: "https://example.com/bcbs-mri-brain",
    },
    {
      payer_id: payerIds[1], // Aetna
      modality: "CT Chest",
      cpt_codes: ["71250", "71260", "71270"],
      icd10_codes: ["J18.9", "R05"],
      requirement_text:
        "PA required for CT Chest with contrast. Documentation needed: 1) Chest X-ray results, 2) Clinical indication for CT vs MRI, 3) Contraindications to MRI if applicable.",
      approval_criteria:
        "Approved for pneumonia complications, suspected malignancy, or when chest X-ray is inconclusive.",
      source_url: "https://example.com/aetna-ct-chest",
    },
    {
      payer_id: payerIds[2], // UHC
      modality: "MRI Lumbar Spine",
      cpt_codes: ["72148", "72149"],
      icd10_codes: ["M54.5", "M51.26"],
      requirement_text:
        "PA required for lumbar spine MRI. Must include: 1) Duration of symptoms (minimum 6 weeks), 2) Conservative treatment attempts (PT, medications), 3) Red flag symptoms if applicable.",
      approval_criteria:
        "Approved for chronic low back pain after failed conservative therapy, radiculopathy, or red flag symptoms.",
      source_url: "https://example.com/uhc-mri-lumbar",
    },
    {
      payer_id: payerIds[0], // BCBS
      modality: "CT Abdomen/Pelvis",
      cpt_codes: ["74176", "74177", "74178"],
      icd10_codes: ["R10.9", "K92.1"],
      requirement_text:
        "PA required for CT abdomen/pelvis. Documentation: 1) Acute vs chronic symptoms, 2) Lab results (CBC, metabolic panel), 3) Ultrasound results if performed.",
      approval_criteria:
        "Approved for acute abdominal pain with concerning features, suspected appendicitis, or abnormal lab findings.",
      source_url: "https://example.com/bcbs-ct-abdomen",
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("policy_snippet")
    .insert(snippets)
    .select();

  if (error) {
    console.log(
      `${colors.red}❌ Error seeding policy snippets: ${error.message}${colors.reset}`
    );
    throw error;
  }

  console.log(
    `${colors.green}✅ Seeded ${data.length} policy snippets${colors.reset}`
  );
  return data;
}

async function seedOrganizationData(orgId: string, userId: string) {
  // Seed providers
  console.log(`\n${colors.blue}👨‍⚕️  Seeding providers...${colors.reset}`);
  const providers = [
    {
      org_id: orgId,
      name: "Dr. Emily Rodriguez",
      specialty: "Radiology",
      npi: "1234567890",
    },
    {
      org_id: orgId,
      name: "Dr. Michael Chen",
      specialty: "Orthopedic Surgery",
      npi: "0987654321",
    },
    {
      org_id: orgId,
      name: "Dr. Sarah Johnson",
      specialty: "Neurology",
      npi: "1122334455",
    },
    {
      org_id: orgId,
      name: "Dr. James Williams",
      specialty: "Internal Medicine",
      npi: "5544332211",
    },
  ];

  const { data: providerData, error: providerError } = await supabaseAdmin
    .from("provider")
    .insert(providers)
    .select();

  if (providerError) {
    console.log(
      `${colors.red}❌ Error seeding providers: ${providerError.message}${colors.reset}`
    );
    throw providerError;
  }
  console.log(
    `${colors.green}✅ Seeded ${providerData.length} providers${colors.reset}`
  );

  // Seed patients
  console.log(`\n${colors.blue}👤 Seeding patients...${colors.reset}`);
  const patients = [
    {
      org_id: orgId,
      name: "John Anderson",
      dob: "1975-03-15",
      mrn: "MRN001234",
      phone: "555-0101",
      email: "john.anderson@email.com",
    },
    {
      org_id: orgId,
      name: "Maria Garcia",
      dob: "1982-07-22",
      mrn: "MRN001235",
      phone: "555-0102",
      email: "maria.garcia@email.com",
    },
    {
      org_id: orgId,
      name: "Robert Thompson",
      dob: "1968-11-08",
      mrn: "MRN001236",
      phone: "555-0103",
      email: "robert.thompson@email.com",
    },
    {
      org_id: orgId,
      name: "Lisa Martinez",
      dob: "1990-05-30",
      mrn: "MRN001237",
      phone: "555-0104",
      email: "lisa.martinez@email.com",
    },
    {
      org_id: orgId,
      name: "David Lee",
      dob: "1955-09-12",
      mrn: "MRN001238",
      phone: "555-0105",
      email: "david.lee@email.com",
    },
  ];

  const { data: patientData, error: patientError } = await supabaseAdmin
    .from("patient")
    .insert(patients)
    .select();

  if (patientError) {
    console.log(
      `${colors.red}❌ Error seeding patients: ${patientError.message}${colors.reset}`
    );
    throw patientError;
  }
  console.log(
    `${colors.green}✅ Seeded ${patientData.length} patients${colors.reset}`
  );

  return { providerData, patientData };
}

async function seedOrders(
  orgId: string,
  patientIds: string[],
  providerIds: string[]
) {
  console.log(`\n${colors.blue}📝 Seeding orders...${colors.reset}`);

  const orders = [
    {
      org_id: orgId,
      patient_id: patientIds[0],
      provider_id: providerIds[0],
      modality: "MRI Brain",
      cpt_codes: ["70553"],
      icd10_codes: ["G89.29", "R51.9"],
      clinic_notes_text:
        "62 yo male with persistent headaches x 8 weeks, not responding to NSAIDs. Neurological exam shows mild photophobia. No history of migraines. Patient requesting imaging for peace of mind.",
      status: "active",
    },
    {
      org_id: orgId,
      patient_id: patientIds[1],
      provider_id: providerIds[1],
      modality: "MRI Lumbar Spine",
      cpt_codes: ["72148"],
      icd10_codes: ["M54.5", "M51.26"],
      clinic_notes_text:
        "45 yo female with chronic low back pain x 3 months. Failed conservative therapy including PT x 6 weeks and NSAIDs. Pain radiating to left leg. Positive straight leg raise test.",
      status: "active",
    },
    {
      org_id: orgId,
      patient_id: patientIds[2],
      provider_id: providerIds[0],
      modality: "CT Chest",
      cpt_codes: ["71260"],
      icd10_codes: ["J18.9"],
      clinic_notes_text:
        "58 yo male with pneumonia, not improving after 7 days of antibiotics. Chest X-ray shows persistent infiltrate. Evaluating for complications.",
      status: "active",
    },
    {
      org_id: orgId,
      patient_id: patientIds[3],
      provider_id: providerIds[2],
      modality: "MRI Brain",
      cpt_codes: ["70553"],
      icd10_codes: ["G43.909"],
      clinic_notes_text:
        "35 yo female with new onset severe headaches, visual changes. Concern for underlying pathology vs complex migraine.",
      status: "active",
    },
    {
      org_id: orgId,
      patient_id: patientIds[4],
      provider_id: providerIds[3],
      modality: "CT Abdomen/Pelvis",
      cpt_codes: ["74177"],
      icd10_codes: ["R10.9"],
      clinic_notes_text:
        "67 yo male with acute abdominal pain, elevated WBC 15K. Ultrasound inconclusive. Evaluating for appendicitis vs diverticulitis.",
      status: "active",
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("order")
    .insert(orders)
    .select();

  if (error) {
    console.log(
      `${colors.red}❌ Error seeding orders: ${error.message}${colors.reset}`
    );
    throw error;
  }

  console.log(`${colors.green}✅ Seeded ${data.length} orders${colors.reset}`);
  return data;
}

async function seedPARequests(
  orgId: string,
  orderIds: string[],
  payerIds: string[]
) {
  console.log(`\n${colors.blue}📋 Seeding PA requests...${colors.reset}`);

  const paRequests = [
    {
      org_id: orgId,
      order_id: orderIds[0],
      payer_id: payerIds[0], // BCBS
      status: "draft",
      priority: "standard",
    },
    {
      org_id: orgId,
      order_id: orderIds[1],
      payer_id: payerIds[2], // UHC
      status: "submitted",
      priority: "standard",
      submitted_at: new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000
      ).toISOString(), // 2 days ago
    },
    {
      org_id: orgId,
      order_id: orderIds[2],
      payer_id: payerIds[1], // Aetna
      status: "pending_info",
      priority: "urgent",
      submitted_at: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000
      ).toISOString(), // 5 days ago
    },
    {
      org_id: orgId,
      order_id: orderIds[3],
      payer_id: payerIds[0], // BCBS
      status: "approved",
      priority: "urgent",
      submitted_at: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString(), // 7 days ago
      auth_number: "AUTH-2024-001234",
      decision_date: new Date(
        Date.now() - 1 * 24 * 60 * 60 * 1000
      ).toISOString(), // 1 day ago
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("pa_request")
    .insert(paRequests)
    .select();

  if (error) {
    console.log(
      `${colors.red}❌ Error seeding PA requests: ${error.message}${colors.reset}`
    );
    throw error;
  }

  console.log(
    `${colors.green}✅ Seeded ${data.length} PA requests${colors.reset}`
  );
  return data;
}

async function seedChecklists(paRequestIds: string[]) {
  console.log(`\n${colors.blue}✅ Seeding checklist items...${colors.reset}`);

  const checklistItems = [
    // For first PA (draft)
    {
      pa_request_id: paRequestIds[0],
      requirement: "Conservative treatment for 6+ weeks",
      rationale: "Required by BlueCross BlueShield for MRI Brain authorization",
      status: "complete",
    },
    {
      pa_request_id: paRequestIds[0],
      requirement: "Neurological examination findings documented",
      rationale: "Clinical exam needed to justify imaging",
      status: "complete",
    },
    {
      pa_request_id: paRequestIds[0],
      requirement: "Previous imaging results (if applicable)",
      rationale: "Helps establish medical necessity",
      status: "incomplete",
    },
    // For second PA (submitted)
    {
      pa_request_id: paRequestIds[1],
      requirement: "Physical therapy for minimum 6 weeks",
      rationale: "UHC requires conservative therapy before MRI",
      status: "complete",
    },
    {
      pa_request_id: paRequestIds[1],
      requirement: "Medication trial documented",
      rationale: "Must show failed conservative treatment",
      status: "complete",
    },
    {
      pa_request_id: paRequestIds[1],
      requirement: "Radiculopathy symptoms documented",
      rationale: "Clinical findings support need for MRI",
      status: "complete",
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("pa_checklist_item")
    .insert(checklistItems)
    .select();

  if (error) {
    console.log(
      `${colors.red}❌ Error seeding checklist items: ${error.message}${colors.reset}`
    );
    throw error;
  }

  console.log(
    `${colors.green}✅ Seeded ${data.length} checklist items${colors.reset}`
  );
  return data;
}

async function seedMedicalNecessitySummaries(paRequestIds: string[]) {
  console.log(
    `\n${colors.blue}📄 Seeding medical necessity summaries...${colors.reset}`
  );

  const summaries = [
    {
      pa_request_id: paRequestIds[1], // Submitted PA
      summary_text: `MEDICAL NECESSITY:
This 45-year-old female patient presents with chronic low back pain of 3 months duration with radiculopathy. Conservative treatment including 6 weeks of physical therapy and NSAIDs has failed to provide relief. MRI Lumbar Spine is medically necessary to evaluate for herniated disc, spinal stenosis, or other structural pathology.

CLINICAL INDICATIONS:
- Chronic low back pain x 3 months
- Left lower extremity radiculopathy
- Positive straight leg raise test
- Failed conservative therapy (PT x 6 weeks, NSAIDs)

RISK/BENEFIT ANALYSIS:
The benefits of obtaining definitive imaging to guide treatment planning outweigh the minimal risks associated with MRI (no radiation exposure). Early identification of structural pathology will allow for appropriate intervention and prevent further deterioration.`,
    },
    {
      pa_request_id: paRequestIds[3], // Approved PA
      summary_text: `MEDICAL NECESSITY:
This 35-year-old female presents with new onset severe headaches and visual changes concerning for underlying intracranial pathology. MRI Brain with contrast is medically necessary to rule out tumor, vascular malformation, or other serious conditions.

CLINICAL INDICATIONS:
- New onset severe headaches
- Associated visual disturbances
- Atypical presentation for migraine
- Neurological symptoms warrant immediate evaluation

RISK/BENEFIT ANALYSIS:
Given the serious nature of potential underlying conditions, the benefits of early detection through MRI significantly outweigh the minimal risks. Timely diagnosis is critical for appropriate treatment and improved patient outcomes.`,
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("pa_medical_necessity")
    .insert(summaries)
    .select();

  if (error) {
    console.log(
      `${colors.red}❌ Error seeding summaries: ${error.message}${colors.reset}`
    );
    throw error;
  }

  console.log(
    `${colors.green}✅ Seeded ${data.length} medical necessity summaries${colors.reset}`
  );
  return data;
}

async function seedStatusEvents(paRequestIds: string[]) {
  console.log(`\n${colors.blue}📊 Seeding status events...${colors.reset}`);

  const events = [
    {
      pa_request_id: paRequestIds[1],
      status: "submitted",
      notes: "PA request submitted to UnitedHealthcare via fax",
    },
    {
      pa_request_id: paRequestIds[2],
      status: "submitted",
      notes: "PA request submitted to Aetna online portal",
    },
    {
      pa_request_id: paRequestIds[2],
      status: "pending_info",
      notes:
        "Payer requested additional clinical documentation - patient's previous imaging reports",
    },
    {
      pa_request_id: paRequestIds[3],
      status: "submitted",
      notes: "Urgent PA request submitted to BlueCross BlueShield",
    },
    {
      pa_request_id: paRequestIds[3],
      status: "approved",
      notes: "PA approved. Auth #: AUTH-2024-001234. Valid for 60 days.",
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("pa_status_event")
    .insert(events)
    .select();

  if (error) {
    console.log(
      `${colors.red}❌ Error seeding status events: ${error.message}${colors.reset}`
    );
    throw error;
  }

  console.log(
    `${colors.green}✅ Seeded ${data.length} status events${colors.reset}`
  );
  return data;
}

async function main() {
  console.log(
    `\n${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.cyan}║  Greenlight PA - Seed Test Data       ║${colors.reset}`
  );
  console.log(
    `${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`
  );

  const confirmed = await promptConfirmation();

  if (!confirmed) {
    console.log(`\n${colors.red}❌ Seeding cancelled${colors.reset}\n`);
    process.exit(0);
  }

  console.log(`\n${colors.green}✅ Starting data seeding...${colors.reset}`);

  try {
    // Get first organization and user (assumes you've already created an account)
    const { data: orgs } = await supabaseAdmin
      .from("org")
      .select("*")
      .limit(1)
      .single();

    if (!orgs) {
      console.log(
        `\n${colors.red}❌ No organization found. Please sign up first to create an org.${colors.reset}\n`
      );
      process.exit(1);
    }

    const orgId = orgs.id;

    const { data: members } = await supabaseAdmin
      .from("member")
      .select("user_id")
      .eq("org_id", orgId)
      .limit(1)
      .single();

    if (!members) {
      console.log(
        `\n${colors.red}❌ No member found. Please sign up first.${colors.reset}\n`
      );
      process.exit(1);
    }

    const userId = members.user_id;

    console.log(`\n${colors.cyan}📍 Using org: ${orgId}${colors.reset}`);
    console.log(`${colors.cyan}👤 Using user: ${userId}${colors.reset}`);

    if (USERS_ONLY) {
      console.log(
        `\n${colors.yellow}ℹ️  USERS_ONLY mode - skipping data seeding${colors.reset}\n`
      );
      process.exit(0);
    }

    // Seed payers and policy snippets (shared across orgs)
    const payers = await seedPayers();
    const payerIds = payers.map((p) => p.id);
    await seedPolicySnippets(payerIds);

    // Seed org-specific data
    const { providerData, patientData } = await seedOrganizationData(
      orgId,
      userId
    );
    const providerIds = providerData.map((p) => p.id);
    const patientIds = patientData.map((p) => p.id);

    const orders = await seedOrders(orgId, patientIds, providerIds);
    const orderIds = orders.map((o) => o.id);

    const paRequests = await seedPARequests(orgId, orderIds, payerIds);
    const paRequestIds = paRequests.map((pa) => pa.id);

    await seedChecklists(paRequestIds);
    await seedMedicalNecessitySummaries(paRequestIds);
    await seedStatusEvents(paRequestIds);

    console.log(
      `\n${colors.green}╔════════════════════════════════════════╗${colors.reset}`
    );
    console.log(
      `${colors.green}║  ✅ Data seeding complete!            ║${colors.reset}`
    );
    console.log(
      `${colors.green}╚════════════════════════════════════════╝${colors.reset}`
    );

    console.log(`\n${colors.cyan}📊 Summary:${colors.reset}`);
    console.log(`   • ${payers.length} payers`);
    console.log(`   • ${providerData.length} providers`);
    console.log(`   • ${patientData.length} patients`);
    console.log(`   • ${orders.length} orders`);
    console.log(`   • ${paRequests.length} PA requests`);
    console.log(
      `\n${colors.cyan}You can now log in and explore the application!${colors.reset}\n`
    );
  } catch (error) {
    console.error(
      `\n${colors.red}❌ Error seeding data:${colors.reset}`,
      error
    );
    process.exit(1);
  }
}

main();
