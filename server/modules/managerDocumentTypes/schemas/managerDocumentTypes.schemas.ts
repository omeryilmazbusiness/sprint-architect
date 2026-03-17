import { z } from "zod";

export const listDocumentTypesQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export const createDocumentTypeBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be at most 60 characters"),
  note: z
    .string()
    .trim()
    .max(240, "Note must be at most 240 characters")
    .optional()
    .nullable(),
});

export type ListDocumentTypesQuery = z.infer<typeof listDocumentTypesQuerySchema>;
export type CreateDocumentTypeBody = z.infer<typeof createDocumentTypeBodySchema>;
