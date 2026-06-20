import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import mainRouter from "./routes/mainroutes.js";

const app = express();

const allowedOrigins = new Set(env.clientUrls);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-server tools, health checks, curl, and non-browser requests.
      if (!origin) {
        callback(null, true);
        return;
      }

      // Allow if wildcard * is set, origin is explicitly allowed, or if it is a Vercel deployment URL
      if (
        allowedOrigins.has("*") ||
        allowedOrigins.has(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
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
app.use("/", mainRouter);

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
