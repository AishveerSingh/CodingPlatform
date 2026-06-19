import { Router } from "express";
import {
  gradeAssignmentSubmission,
  submitAssignment
} from "../controllers/assignment.controller.js";
import {
  attachRoleProfile,
  requireAuth,
  requireCourseAccess,
  requireCourseManagementAccess,
  requireMongoUser
} from "../middleware/auth.middleware.js";
import { pool } from "../config/db.js";

const assignmentRouter = Router();

assignmentRouter.use(requireAuth, requireMongoUser, attachRoleProfile);

assignmentRouter.post("/:assignmentId/submissions", async (req, res, next) => {
  try {
    const assignmentResult = await pool.query(
      `
        SELECT id, course_id
        FROM course_assignments
        WHERE id = $1
      `,
      [req.params.assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Assignment not found."
      });
    }

    req.assignment = {
      id: assignmentResult.rows[0].id,
      course_id: assignmentResult.rows[0].course_id
    };
    req.params.courseId = assignmentResult.rows[0].course_id;
    return requireCourseAccess(req, res, () => submitAssignment(req, res, next));
  } catch (error) {
    next(error);
  }
});

assignmentRouter.patch("/:assignmentId/submissions/:submissionId/grade", async (req, res, next) => {
  try {
    const assignmentResult = await pool.query(
      `
        SELECT id, course_id
        FROM course_assignments
        WHERE id = $1
      `,
      [req.params.assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Assignment not found."
      });
    }

    req.assignment = {
      id: assignmentResult.rows[0].id,
      course_id: assignmentResult.rows[0].course_id
    };
    req.params.courseId = assignmentResult.rows[0].course_id;
    return requireCourseManagementAccess(req, res, () => gradeAssignmentSubmission(req, res, next));
  } catch (error) {
    next(error);
  }
});

export default assignmentRouter;
