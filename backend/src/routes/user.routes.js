import { Router } from "express";
import {
  changeCurrentUserPassword,
  getAccessibleStudentById,
  getAccessibleStudents,
  getCurrentUser,
  getUserById,
  getUsers,
  loginAdmin,
  loginFaculty,
  loginStudent,
  registerAdmin,
  registerFaculty,
  registerStudent,
  resetStudentPassword,
  updateCurrentUser
} from "../controllers/user.controller.js";
import { requireAuth, requireMongoUser, requireRole } from "../middleware/auth.middleware.js";

const userRouter = Router();

userRouter.post("/admin-register", registerAdmin);
userRouter.post("/admin-login", loginAdmin);
userRouter.post("/faculty-register", requireAuth, requireRole("admin"), registerFaculty);
userRouter.post("/faculty-login", loginFaculty);
userRouter.post("/student-register", requireAuth, requireRole("admin"), registerStudent);
userRouter.post("/student-login", loginStudent);

userRouter.get("/me", requireAuth, getCurrentUser);
userRouter.put("/me", requireAuth, updateCurrentUser);
userRouter.put("/me/password", requireAuth, changeCurrentUserPassword);
userRouter.get("/students/accessible", requireAuth, requireMongoUser, getAccessibleStudents);
userRouter.get("/students/accessible/:studentId", requireAuth, requireMongoUser, getAccessibleStudentById);

userRouter.get("/", requireAuth, requireRole("admin"), getUsers);
userRouter.get("/:userId", requireAuth, requireRole("admin"), getUserById);
userRouter.put("/:userId/reset-password", requireAuth, requireRole("admin"), resetStudentPassword);

export default userRouter;
