const STUDENT_STORAGE_KEY = "coding_platform_student";
const ADMIN_STORAGE_KEY = "coding_platform_admin";
const FACULTY_STORAGE_KEY = "coding_platform_faculty";

function safeParseSession(storedValue) {
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return parsedValue && typeof parsedValue === "object" ? parsedValue : null;
  } catch (_error) {
    return null;
  }
}

function readSession(storageKey) {
  return safeParseSession(localStorage.getItem(storageKey));
}

function writeSession(storageKey, session) {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

function clearSession(storageKey) {
  localStorage.removeItem(storageKey);
}

export function saveStudentSession(session) {
  writeSession(STUDENT_STORAGE_KEY, session);
}

export function getStudentSession() {
  return readSession(STUDENT_STORAGE_KEY);
}

export function clearStudentSession() {
  clearSession(STUDENT_STORAGE_KEY);
}

export function saveAdminSession(session) {
  writeSession(ADMIN_STORAGE_KEY, session);
}

export function getAdminSession() {
  return readSession(ADMIN_STORAGE_KEY);
}

export function clearAdminSession() {
  clearSession(ADMIN_STORAGE_KEY);
}

export function saveFacultySession(session) {
  writeSession(FACULTY_STORAGE_KEY, session);
}

export function getFacultySession() {
  return readSession(FACULTY_STORAGE_KEY);
}

export function clearFacultySession() {
  clearSession(FACULTY_STORAGE_KEY);
}

export function getAuthHeaders(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
}
