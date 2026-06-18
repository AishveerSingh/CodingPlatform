import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import mainRouter from "./routes/mainroutes.js";

const app = express();

app.use(
  cors({
    origin: [env.clientUrl, "http://localhost:5174"]
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Coding platform backend is running."
  });
});

app.use("/api", mainRouter);

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);

  res.status(500).json({
    message: "Something went wrong on the server.",
    error: error.message
  });
});

export default app;
