import { describe, expect, it } from "vitest";
import {
  validateOrderCreate,
  validateOrderUpdate,
  validatePaRequestCreate,
  validatePatientCreate,
  validateProviderCreate,
  validateProviderUpdate,
} from "@web/lib/validation";

describe("validation schemas", () => {
  it("normalizes order codes and trims strings", () => {
    const result = validateOrderCreate({
      patient_id: " patient-1 ",
      provider_id: "provider-1",
      modality: " MRI Brain ",
      cpt_codes: [" 70553 ", "70553", "", "70552"],
      icd10_codes: [" G89.29 ", "R51"],
      clinic_notes_text: "  Headache ",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.patient_id).toBe("patient-1");
    expect(result.data.modality).toBe("MRI Brain");
    expect(result.data.cpt_codes).toEqual(["70553", "70552"]);
    expect(result.data.icd10_codes).toEqual(["G89.29", "R51"]);
    expect(result.data.clinic_notes_text).toBe("Headache");
  });

  it("rejects order payloads missing codes", () => {
    const result = validateOrderCreate({
      patient_id: "p1",
      provider_id: "pr1",
      modality: "MRI",
      cpt_codes: [],
      icd10_codes: [],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/At least one code/);
  });

  it("validates order update requires at least one field", () => {
    const result = validateOrderUpdate({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("No fields to update");
  });

  it("validates PA request create defaults priority", () => {
    const result = validatePaRequestCreate({
      order_id: "order-1 ",
      payer_id: " payer-1",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.priority).toBe("standard");
    expect(result.data.order_id).toBe("order-1");
    expect(result.data.payer_id).toBe("payer-1");
  });

  it("validates patient and provider payloads", () => {
    const patient = validatePatientCreate({
      name: "  Jane Doe  ",
      phone: " ",
    });
    expect(patient.success).toBe(true);
    if (!patient.success) return;
    expect(patient.data.phone).toBeNull();

    const provider = validateProviderCreate({
      name: "Dr. Smith ",
      specialty: " Radiology",
    });
    expect(provider.success).toBe(true);
    if (!provider.success) return;
    expect(provider.data.specialty).toBe("Radiology");

    const providerUpdate = validateProviderUpdate({
      id: " provider-1 ",
      name: "Dr. Smith",
    });
    expect(providerUpdate.success).toBe(true);
    if (!providerUpdate.success) return;
    expect(providerUpdate.data.id).toBe("provider-1");
  });
});
