import assignmentRouter from "./assignment.routes.js";
import { Router } from "express";
import adminRouter from "./admin.routes.js";
import authRouter from "./auth.routes.js";
import courseRouter from "./course.routes.js";
import healthRouter from "./health.routes.js";
import problemRouter from "./problem.routes.js";
import submissionRouter from "./submission.routes.js";
import userRouter from "./user.routes.js";
const mainRouter = Router();

// Register all API route groups here.
mainRouter.use("/admin", adminRouter);
mainRouter.use("/assignments", assignmentRouter);
mainRouter.use("/auth", authRouter);
mainRouter.use("/courses", courseRouter);
mainRouter.use("/health", healthRouter);
mainRouter.use("/problems", problemRouter);
mainRouter.use("/submissions", submissionRouter);
mainRouter.use("/users", userRouter);
export default mainRouter;
