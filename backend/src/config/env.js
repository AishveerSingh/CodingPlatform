import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

function parseClientUrls(value) {
  return (value || "http://localhost:5173")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  clientUrls: parseClientUrls(process.env.CLIENT_URL),
  collegeEmailDomain: (process.env.COLLEGE_EMAIL_DOMAIN || "college.com").trim().toLowerCase(),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/coding_platform",
  pgSsl: process.env.PGSSL === "true",
  jwtSecret: process.env.JWT_SECRET || "development-jwt-secret-change-me",
  judge0BaseUrl: (process.env.JUDGE0_BASE_URL || "https://ce.judge0.com").trim(),
  judge0ApiKey: (process.env.JUDGE0_API_KEY || "").trim(),
  judge0ApiHost: (process.env.JUDGE0_API_HOST || "").trim(),
  judge0PollIntervalMs: Number(process.env.JUDGE0_POLL_INTERVAL_MS) || 500,
  judge0MaxPollAttempts: Number(process.env.JUDGE0_MAX_POLL_ATTEMPTS) || 20,
  judge0LanguageCpp: Number(process.env.JUDGE0_LANGUAGE_CPP) || 105,
  judge0LanguageJava: Number(process.env.JUDGE0_LANGUAGE_JAVA) || 91,
  judge0LanguageJavascript: Number(process.env.JUDGE0_LANGUAGE_JAVASCRIPT) || 102,
  judge0LanguagePython: Number(process.env.JUDGE0_LANGUAGE_PYTHON) || 92
};
