import { z } from "zod";

export const listPatientsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "APPROVED", "ENDED", "ALL"]).default("ALL"),
  pendingDocs: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  todayAppt: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
