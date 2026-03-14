import { Router } from "express";
import { authMiddleware, requireRole } from "../../auth/middleware";
import {
  handleBulkDeactivate,
  handleBulkPurge,
  handleDeactivateSingle,
  handleGetPurgeImpact,
  handlePurgeUser,
} from "./adminUsers.controller";

const router = Router();

router.post(
  "/users/bulk-deactivate",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  handleBulkDeactivate,
);

router.post(
  "/users/bulk-purge",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  handleBulkPurge,
);

router.post(
  "/users/:id/deactivate",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  handleDeactivateSingle,
);

router.get(
  "/users/:id/purge-impact",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  handleGetPurgeImpact,
);

router.delete(
  "/users/:id/purge",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  handlePurgeUser,
);

export default router;
