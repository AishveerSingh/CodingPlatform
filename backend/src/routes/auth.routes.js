import { Router } from "express";
import { getAuthMe, loginUser, registerUser } from "../controllers/auth.mongo.controller.js";
import {
  attachRoleProfile,
  requireAuth,
  requireMongoUser
} from "../middleware/auth.middleware.js";

const authRouter = Router();

authRouter.post("/register/:role", registerUser);
authRouter.post("/login/:role", loginUser);
authRouter.get("/me", requireAuth, requireMongoUser, attachRoleProfile, getAuthMe);

export default authRouter;
