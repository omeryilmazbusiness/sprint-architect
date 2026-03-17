import { Router } from "express";
import {
  handleListTransports,
  handleGetTransport,
  handleCreateTransport,
  handleUpdateTransport,
  handleDeleteTransport,
} from "./managerTransports.controller";

const router = Router();

router.get("/transports", handleListTransports);
router.get("/transports/:id", handleGetTransport);
router.post("/transports", handleCreateTransport);
router.put("/transports/:id", handleUpdateTransport);
router.delete("/transports/:id", handleDeleteTransport);

export default router;
