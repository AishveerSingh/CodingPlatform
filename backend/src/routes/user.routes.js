import { Router } from "express";
import {
  changeCurrentUserPassword,
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
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const userRouter = Router();

userRouter.post("/admin-register", registerAdmin);
userRouter.post("/admin-login", loginAdmin);
userRouter.post("/faculty-register", registerFaculty);
userRouter.post("/faculty-login", loginFaculty);
userRouter.post("/student-register", registerStudent);
userRouter.post("/student-login", loginStudent);

userRouter.get("/me", requireAuth, getCurrentUser);
userRouter.put("/me", requireAuth, updateCurrentUser);
userRouter.put("/me/password", requireAuth, changeCurrentUserPassword);

userRouter.get("/", requireAuth, requireRole("admin"), getUsers);
userRouter.get("/:userId", requireAuth, requireRole("admin"), getUserById);
userRouter.put("/:userId/reset-password", requireAuth, requireRole("admin"), resetStudentPassword);

export default userRouter;
