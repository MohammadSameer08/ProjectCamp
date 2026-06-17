import { Router } from "express";
import { healthCheck } from "../controllers/healthcheck.controller.js";

const router = Router();

router.get("/", healthCheck);
router.get("/ping", healthCheck);

export default router;
