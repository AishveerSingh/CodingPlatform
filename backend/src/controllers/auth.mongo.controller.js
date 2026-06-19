import { pool } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hashPassword, signAuthToken, verifyPassword } from "../utils/auth.js";

function sanitizeUser(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    profile: row.profile || null
  };
}

async function fetchRoleProfile(client, userId, role) {
  if (role === "student") {
    const result = await client.query(
      `
        SELECT roll_number, branch, semester, section, batch
        FROM student_profiles
        WHERE user_id = $1
      `,
      [userId]
    );
    return result.rows[0] || null;
  }

  if (role === "faculty") {
    const result = await client.query(
      `
        SELECT employee_id, department, designation
        FROM faculty_profiles
        WHERE user_id = $1
      `,
      [userId]
    );
    return result.rows[0] || null;
  }

  return null;
}

async function buildUserPayload(client, user) {
  return sanitizeUser({
    ...user,
    profile: await fetchRoleProfile(client, user.id, user.role)
  });
}

export const registerUser = asyncHandler(async (req, res) => {
  const { role } = req.params;
  const {
    fullName,
    email,
    password,
    rollNumber,
    branch,
    semester,
    section,
    batch,
    employeeId,
    department,
    designation
  } = req.body;

  if (!["admin", "faculty", "student"].includes(role)) {
    return res.status(400).json({ message: "Unsupported role." });
  }

  if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({ message: "Full name, email, and password are required." });
  }

  if (password.trim().length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long." });
  }

  if (
    role === "student" &&
    (!rollNumber?.trim() || !branch?.trim() || !semester || !section?.trim() || !batch?.trim())
  ) {
    return res.status(400).json({
      message: "Student registration requires roll number, branch, semester, section, and batch."
    });
  }

  if (role === "faculty" && (!employeeId?.trim() || !department?.trim())) {
    return res.status(400).json({
      message: "Faculty registration requires employee ID and department."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await client.query(
      `
        SELECT id
        FROM users
        WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const userResult = await client.query(
      `
        INSERT INTO users (full_name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, full_name, email, role, created_at
      `,
      [fullName.trim(), normalizedEmail, await hashPassword(password.trim()), role]
    );

    const user = userResult.rows[0];

    if (role === "student") {
      await client.query(
        `
          INSERT INTO student_profiles (user_id, roll_number, branch, semester, section, batch)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          user.id,
          rollNumber.trim(),
          branch.trim().toUpperCase(),
          Number(semester),
          section.trim().toUpperCase(),
          batch.trim()
        ]
      );
    }

    if (role === "faculty") {
      await client.query(
        `
          INSERT INTO faculty_profiles (user_id, employee_id, department, designation)
          VALUES ($1, $2, $3, $4)
        `,
        [user.id, employeeId.trim(), department.trim().toUpperCase(), designation?.trim() || "Faculty"]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: `${role[0].toUpperCase()}${role.slice(1)} account created successfully.`,
      token: signAuthToken({ id: user.id, email: user.email, role: user.role }),
      user: await buildUserPayload(client, user)
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const loginUser = asyncHandler(async (req, res) => {
  const { role } = req.params;
  const { email, password } = req.body;

  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
        SELECT id, full_name, email, password_hash, role, created_at
        FROM users
        WHERE email = $1 AND role = $2
      `,
      [email.trim().toLowerCase(), role]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = result.rows[0];
    const isValidPassword = await verifyPassword(password.trim(), user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      message: `${role[0].toUpperCase()}${role.slice(1)} login successful.`,
      token: signAuthToken({ id: user.id, email: user.email, role: user.role }),
      user: await buildUserPayload(client, user)
    });
  } finally {
    client.release();
  }
});

export const getAuthMe = asyncHandler(async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
        SELECT id, full_name, email, role, created_at
        FROM users
        WHERE id = $1
      `,
      [req.auth.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(await buildUserPayload(client, result.rows[0]));
  } finally {
    client.release();
  }
});
