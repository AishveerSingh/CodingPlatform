import { Router } from "express";
import {
  createSubmission,
  getAdminSubmissions,
  getStudentProgress,
  getStudentSubmissions,
  runSubmission
} from "../controllers/submission.controller.js";
import {
  requireAuth,
  requireRole,
  requireStudentMatchOrAdmin
} from "../middleware/auth.middleware.js";

const submissionRouter = Router();

submissionRouter.post("/run", requireAuth, runSubmission);
submissionRouter.post("/", requireAuth, createSubmission);
submissionRouter.get("/", requireAuth, requireRole("admin"), getAdminSubmissions);
submissionRouter.get(
  "/student/:studentId",
  requireAuth,
  requireStudentMatchOrAdmin,
  getStudentSubmissions
);
submissionRouter.get(
  "/student/:studentId/progress",
  requireAuth,
  requireStudentMatchOrAdmin,
  getStudentProgress
);

export default submissionRouter;
