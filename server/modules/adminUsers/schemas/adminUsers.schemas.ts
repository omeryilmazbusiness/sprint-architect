import { z } from "zod";

export const BulkDeactivateSchema = z.object({
  targets: z
    .array(
      z.object({
        id: z.string().min(1),
        entityType: z.enum(["ADMIN", "MANAGER", "PATIENT"]),
      }),
    )
    .min(1, "At least one target is required")
    .max(100, "Maximum 100 targets per request"),
});

export type BulkDeactivateInput = z.infer<typeof BulkDeactivateSchema>;
