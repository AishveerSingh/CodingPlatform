import { Router } from "express";
import {
  addCourseCodingProblem,
  addCourseMaterial,
  createCourse,
  deleteCourse,
  getCourseById,
  getCourseFilters,
  getCourseStudents,
  listCourses,
  runCourseCodingProblem,
  submitCourseCodingProblem,
  updateCourse
} from "../controllers/course.controller.js";
import {
  createAssignment,
  listAssignmentsForCourse
} from "../controllers/assignment.controller.js";
import {
  attachRoleProfile,
  requireAuth,
  requireCourseAccess,
  requireCourseManagementAccess,
  requireMongoUser,
  requireRole,
  validateStudentCourseAccess
} from "../middleware/auth.middleware.js";

const courseRouter = Router();

courseRouter.use(requireAuth, requireMongoUser, attachRoleProfile);

courseRouter.get("/filters", requireRole("admin"), getCourseFilters);
courseRouter.get("/", listCourses);
courseRouter.post("/", requireRole("admin"), createCourse);
courseRouter.get("/:courseId", requireCourseAccess, validateStudentCourseAccess, getCourseById);
courseRouter.put("/:courseId", requireRole("admin"), updateCourse);
courseRouter.delete("/:courseId", requireRole("admin"), deleteCourse);
courseRouter.get("/:courseId/students", requireCourseManagementAccess, getCourseStudents);
courseRouter.get("/:courseId/assignments", requireCourseAccess, validateStudentCourseAccess, listAssignmentsForCourse);
courseRouter.post("/:courseId/assignments", requireCourseManagementAccess, createAssignment);
courseRouter.post("/:courseId/materials", requireCourseManagementAccess, addCourseMaterial);
courseRouter.post("/:courseId/coding-problems", requireCourseManagementAccess, addCourseCodingProblem);
courseRouter.post("/:courseId/coding-problems/:problemId/run", requireCourseAccess, validateStudentCourseAccess, runCourseCodingProblem);
courseRouter.post("/:courseId/coding-problems/:problemId/submit", requireCourseAccess, validateStudentCourseAccess, submitCourseCodingProblem);

export default courseRouter;
