import { Router } from "express";
import { authMiddleware, requireRole } from "../../auth/middleware";
import { handleBulkDeactivate } from "./adminUsers.controller";

const router = Router();

router.post(
  "/users/bulk-deactivate",
  authMiddleware,
  requireRole("ADMIN"),
  handleBulkDeactivate,
);

export default router;
