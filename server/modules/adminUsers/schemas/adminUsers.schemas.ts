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

export const DeactivateSingleUserSchema = z.object({
  entityType: z.enum(["ADMIN", "MANAGER", "PATIENT"]),
});

export type DeactivateSingleUserInput = z.infer<typeof DeactivateSingleUserSchema>;

export const BulkPurgeSchema = z.object({
  targets: z
    .array(
      z.object({
        id: z.string().min(1),
        entityType: z.enum(["ADMIN", "MANAGER", "PATIENT"]),
      }),
    )
    .min(1, "At least one target is required")
    .max(50, "Maximum 50 targets per purge request"),
  confirmText: z.string().min(1, "confirmText is required"),
});

export type BulkPurgeInput = z.infer<typeof BulkPurgeSchema>;
