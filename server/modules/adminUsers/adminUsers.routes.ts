import { Router } from "express";
import { authMiddleware, requireRole } from "../../auth/middleware";
import {
  handleBulkDeactivate,
  handleBulkPurge,
  handleDeactivateSingle,
} from "./adminUsers.controller";

const router = Router();

router.post(
  "/users/bulk-deactivate",
  authMiddleware,
  requireRole("ADMIN"),
  handleBulkDeactivate,
);

router.post(
  "/users/bulk-purge",
  authMiddleware,
  requireRole("ADMIN"),
  handleBulkPurge,
);

router.post(
  "/users/:id/deactivate",
  authMiddleware,
  requireRole("ADMIN"),
  handleDeactivateSingle,
);

export default router;
