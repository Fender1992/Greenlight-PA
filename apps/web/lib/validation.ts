import { z } from "zod";

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: string;
  issues: string[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const nonEmptyTrimmedString = z
  .string({ required_error: "Field is required" })
  .transform((value) => value.trim())
  .pipe(z.string().min(1, "Field cannot be empty"));

const optionalNullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const codeArraySchema = z
  .array(z.string())
  .transform((codes) =>
    Array.from(
      new Set(
        codes.map((code) => code.trim()).filter((code) => code.length > 0)
      )
    )
  )
  .refine((codes) => codes.length > 0, {
    message: "At least one code is required",
  });

export const OrderCreateSchema = z.object({
  org_id: z.string().optional().nullable(),
  patient_id: nonEmptyTrimmedString,
  provider_id: nonEmptyTrimmedString,
  modality: nonEmptyTrimmedString,
  cpt_codes: codeArraySchema,
  icd10_codes: codeArraySchema,
  clinic_notes_text: optionalNullableString,
});

export const OrderUpdateSchema = z
  .object({
    modality: z
      .string()
      .transform((value) => value.trim())
      .pipe(z.string().min(1))
      .optional(),
    cpt_codes: codeArraySchema.optional(),
    icd10_codes: codeArraySchema.optional(),
    clinic_notes_text: optionalNullableString,
  })
  .refine(
    (value) =>
      value.modality !== undefined ||
      value.cpt_codes !== undefined ||
      value.icd10_codes !== undefined ||
      value.clinic_notes_text !== undefined,
    { message: "No fields to update" }
  );

export const PaRequestCreateSchema = z.object({
  org_id: z.string().optional().nullable(),
  order_id: nonEmptyTrimmedString,
  payer_id: nonEmptyTrimmedString,
  priority: z.enum(["standard", "urgent"]).default("standard"),
});

export const PatientCreateSchema = z.object({
  org_id: z.string().optional().nullable(),
  name: nonEmptyTrimmedString,
  mrn: optionalNullableString,
  dob: optionalNullableString,
  sex: optionalNullableString,
  phone: optionalNullableString,
  address: optionalNullableString,
});

export const ProviderCreateSchema = z.object({
  org_id: z.string().optional().nullable(),
  name: nonEmptyTrimmedString,
  npi: optionalNullableString,
  specialty: optionalNullableString,
  location: optionalNullableString,
});

export const ProviderUpdateSchema = ProviderCreateSchema.extend({
  id: nonEmptyTrimmedString,
});

function toValidationResult<T>(
  result: z.SafeParseReturnType<unknown, T>
): ValidationResult<T> {
  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = result.error.issues.map((issue) => issue.message);
  return {
    success: false,
    error: issues[0] ?? "Invalid payload",
    issues,
  };
}

export function validateOrderCreate(
  input: unknown
): ValidationResult<z.infer<typeof OrderCreateSchema>> {
  return toValidationResult(OrderCreateSchema.safeParse(input));
}

export function validateOrderUpdate(
  input: unknown
): ValidationResult<z.infer<typeof OrderUpdateSchema>> {
  return toValidationResult(OrderUpdateSchema.safeParse(input));
}

export function validatePaRequestCreate(
  input: unknown
): ValidationResult<z.infer<typeof PaRequestCreateSchema>> {
  return toValidationResult(PaRequestCreateSchema.safeParse(input));
}

export function validatePatientCreate(
  input: unknown
): ValidationResult<z.infer<typeof PatientCreateSchema>> {
  return toValidationResult(PatientCreateSchema.safeParse(input));
}

export function validateProviderCreate(
  input: unknown
): ValidationResult<z.infer<typeof ProviderCreateSchema>> {
  return toValidationResult(ProviderCreateSchema.safeParse(input));
}

export function validateProviderUpdate(
  input: unknown
): ValidationResult<z.infer<typeof ProviderUpdateSchema>> {
  return toValidationResult(ProviderUpdateSchema.safeParse(input));
}
