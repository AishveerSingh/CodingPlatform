import { getAuthHeaders } from "./session";

export const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function normalizeRequestError(error, fallbackMessage = "Request failed.") {
  const rawMessage = String(error?.message || fallbackMessage);
  const uppercaseMessage = rawMessage.toUpperCase();

  if (uppercaseMessage.includes("ECONNREFUSED")) {
    return "Database or backend connection was refused. Make sure the backend server and PostgreSQL are running.";
  }

  if (rawMessage === "Failed to fetch") {
    return "Backend is unreachable. Make sure the API server is running on http://localhost:5000.";
  }

  return rawMessage;
}

export async function apiRequest(path, options = {}, token) {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...getAuthHeaders(token),
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  } catch (error) {
    throw new Error(normalizeRequestError(error));
  }
}
