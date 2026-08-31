import { z } from 'zod';

import { EntityStatusSchema } from './roles';

/**
 * Initial, deliberately conservative field-type catalog
 * (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §8.2 — "los tipos concretos
 * de campos todavía deben definirse"). Extend this set when the business
 * confirms a new type is needed; do not pre-invent types beyond what a basic
 * data-collection form needs today.
 */
export const FormFieldTypeSchema = z.enum(['TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'SELECT', 'CHECKBOX']);
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;

const FormFieldOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

/**
 * Mirrors the `CHECK (type <> 'SELECT' OR options IS NOT NULL)` constraint
 * on `form_fields` (docs/adr/011) — a SELECT field without options is an
 * invalid state, caught here in addition to the database.
 */
export const CreateFormFieldSchema = z
  .object({
    key: z.string().min(1).max(100),
    label: z.string().min(1).max(200),
    type: FormFieldTypeSchema,
    isRequired: z.boolean().default(false),
    sortOrder: z.number().int().min(0).default(0),
    options: z.array(FormFieldOptionSchema).min(1).nullable().optional(),
    validationRules: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine((data) => data.type !== 'SELECT' || (data.options && data.options.length > 0), {
    message: 'A SELECT field requires at least one option.',
    path: ['options'],
  });
export type CreateFormField = z.infer<typeof CreateFormFieldSchema>;

/**
 * Partial update — deliberately does NOT re-run the SELECT/options refine:
 * a partial payload (e.g. only `{ label }`) can't know the field's current
 * `type` without the row already loaded, so combined validity is the
 * service layer's job (it loads the existing entity, merges, then re-checks
 * before persisting). The database `CHECK` is the final backstop either way.
 */
export const UpdateFormFieldSchema = z.object({
  key: z.string().min(1).max(100).optional(),
  label: z.string().min(1).max(200).optional(),
  type: FormFieldTypeSchema.optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  options: z.array(FormFieldOptionSchema).min(1).nullable().optional(),
  validationRules: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type UpdateFormField = z.infer<typeof UpdateFormFieldSchema>;

export const FormFieldSchema = z.object({
  id: z.uuid(),
  formVersionId: z.uuid(),
  key: z.string(),
  label: z.string(),
  type: FormFieldTypeSchema,
  isRequired: z.boolean(),
  sortOrder: z.number().int(),
  options: z.array(FormFieldOptionSchema).nullable(),
  validationRules: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type FormField = z.infer<typeof FormFieldSchema>;

export const FormDefinitionSchema = z.object({
  id: z.uuid(),
  serviceId: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type FormDefinition = z.infer<typeof FormDefinitionSchema>;

export const UpdateFormVersionSchema = z.object({
  status: EntityStatusSchema,
});
export type UpdateFormVersion = z.infer<typeof UpdateFormVersionSchema>;

export const FormVersionSchema = z.object({
  id: z.uuid(),
  formDefinitionId: z.uuid(),
  versionNumber: z.number().int().positive(),
  status: EntityStatusSchema,
  isPublished: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type FormVersion = z.infer<typeof FormVersionSchema>;

/** `GET /form-versions/:id` response shape — the version plus its fields, already sorted by sortOrder. */
export const FormVersionWithFieldsSchema = FormVersionSchema.extend({
  fields: z.array(FormFieldSchema),
});
export type FormVersionWithFields = z.infer<typeof FormVersionWithFieldsSchema>;

/**
 * `answers` is a free-form key→value map validated against the published
 * FormVersion's fields by the service layer (required keys present, SELECT
 * values within `options`, etc.) — Zod here only guarantees the outer shape
 * is a plain object, not the field-specific business rules.
 */
export const CreateFormSubmissionSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
});
export type CreateFormSubmission = z.infer<typeof CreateFormSubmissionSchema>;

export const FormSubmissionSchema = z.object({
  id: z.uuid(),
  formVersionId: z.uuid(),
  answers: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime(),
});
export type FormSubmission = z.infer<typeof FormSubmissionSchema>;
