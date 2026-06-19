import { pool } from "../config/db.js";
import { hashPassword, signAuthToken, verifyPassword } from "../utils/auth.js";

function sanitizeUser(row) {
  const profile =
    row.role === "student"
      ? {
          roll_number: row.roll_number || null,
          branch: row.branch || null,
          semester: row.semester || null,
          section: row.section || null,
          batch: row.batch || null
        }
      : row.role === "faculty"
        ? {
            employee_id: row.employee_id || null,
            department: row.department || null,
            designation: row.designation || null
          }
        : null;

  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    submission_count: row.submission_count,
    accepted_count: row.accepted_count,
    profile
  };
}

async function fetchUserSummary(userId) {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.created_at,
        COUNT(s.id)::int AS submission_count,
        COUNT(*) FILTER (WHERE s.status = 'accepted')::int AS accepted_count,
        sp.roll_number,
        sp.branch,
        sp.semester,
        sp.section,
        sp.batch,
        fp.employee_id,
        fp.department,
        fp.designation
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
      LEFT JOIN submissions s ON s.student_id = u.id
      WHERE u.id = $1
      GROUP BY
        u.id,
        sp.roll_number,
        sp.branch,
        sp.semester,
        sp.section,
        sp.batch,
        fp.employee_id,
        fp.department,
        fp.designation
    `,
    [userId]
  );

  return result.rows[0] ? sanitizeUser(result.rows[0]) : null;
}

async function registerUser(req, res, next, role) {
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

  if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({
      message: "Full name, email, and password are required."
    });
  }

  if (password.trim().length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long."
    });
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

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    const passwordHash = await hashPassword(password.trim());

    const existingUser = await pool.query(
      `
        SELECT id, role, password_hash
        FROM users
        WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];

      if (existing.role !== role) {
        return res.status(409).json({
          message: "This email is already registered under a different role."
        });
      }

      if (!existing.password_hash) {
        const upgradedUser = await pool.query(
          `
            UPDATE users
            SET full_name = $1, password_hash = $2, role = $3
            WHERE id = $4
            RETURNING id, full_name, email, role, created_at
          `,
          [normalizedName, passwordHash, role, existing.id]
        );

        const user = await fetchUserSummary(upgradedUser.rows[0].id);
        const token = signAuthToken(upgradedUser.rows[0]);

        return res.status(201).json({
          message: `${role === "admin" ? "Admin" : role === "faculty" ? "Faculty" : "Student"} account secured successfully.`,
          token,
          user
        });
      }

      return res.status(409).json({
        message: `An ${role} account with this email already exists. Please log in instead.`
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          INSERT INTO users (full_name, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
          RETURNING id, full_name, email, role, created_at
        `,
        [normalizedName, normalizedEmail, passwordHash, role]
      );

      const user = result.rows[0];

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
      const createdUser = await fetchUserSummary(user.id);
      const token = signAuthToken(user);

      res.status(201).json({
        message: `${role === "admin" ? "Admin" : role === "faculty" ? "Faculty" : "Student"} account created successfully.`,
        token,
        user: createdUser
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}

async function loginUser(req, res, next, role) {
  const { email, password } = req.body;

  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({
      message: "Email and password are required."
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `
        SELECT id, full_name, email, password_hash, role, created_at
        FROM users
        WHERE email = $1 AND role = $2
      `,
      [normalizedEmail, role]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const userRecord = result.rows[0];
    if (!userRecord.password_hash) {
      return res.status(401).json({
        message: "This account needs to be registered again with a password first."
      });
    }

    const isValidPassword = await verifyPassword(password.trim(), userRecord.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = await fetchUserSummary(userRecord.id);
    const token = signAuthToken(userRecord);

    res.json({
      message: `${role === "admin" ? "Admin" : role === "faculty" ? "Faculty" : "Student"} login successful.`,
      token,
      user
    });
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req, res, next) {
  const role = req.query.role?.trim().toLowerCase() ?? "";
  const search = req.query.search?.trim() ?? "";

  if (role && !["student", "faculty", "admin"].includes(role)) {
    return res.status(400).json({
      message: "Role filter must be student, faculty, or admin."
    });
  }

  try {
    const values = [];
    const filters = [];

    if (role) {
      values.push(role);
      filters.push(`u.role = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      filters.push(`(
        u.full_name ILIKE $${values.length}
        OR u.email ILIKE $${values.length}
        OR sp.roll_number ILIKE $${values.length}
        OR fp.employee_id ILIKE $${values.length}
      )`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.role,
          u.created_at,
          COUNT(s.id)::int AS submission_count,
          COUNT(*) FILTER (WHERE s.status = 'accepted')::int AS accepted_count,
          sp.roll_number,
          sp.branch,
          sp.semester,
          sp.section,
          sp.batch,
          fp.employee_id,
          fp.department,
          fp.designation
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
        LEFT JOIN submissions s ON s.student_id = u.id
        ${whereClause}
        GROUP BY
          u.id,
          sp.roll_number,
          sp.branch,
          sp.semester,
          sp.section,
          sp.batch,
          fp.employee_id,
          fp.department,
          fp.designation
        ORDER BY u.created_at DESC
      `,
      values
    );

    res.json(result.rows.map(sanitizeUser));
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req, res, next) {
  const { userId } = req.params;

  try {
    const user = await fetchUserSummary(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await fetchUserSummary(req.auth.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateCurrentUser(req, res, next) {
  const { fullName, email } = req.body;

  if (!fullName?.trim() || !email?.trim()) {
    return res.status(400).json({
      message: "Full name and email are required."
    });
  }

  try {
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const duplicateResult = await pool.query(
      `
        SELECT id
        FROM users
        WHERE email = $1 AND id <> $2
      `,
      [normalizedEmail, req.auth.userId]
    );

    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({
        message: "This email is already in use by another account."
      });
    }

    const result = await pool.query(
      `
        UPDATE users
        SET full_name = $1,
            email = $2
        WHERE id = $3
        RETURNING id, full_name, email, role, created_at
      `,
      [normalizedName, normalizedEmail, req.auth.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const updatedUser = await fetchUserSummary(req.auth.userId);
    const token = signAuthToken(result.rows[0]);

    res.json({
      message: "Account details updated successfully.",
      token,
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
}

export async function changeCurrentUserPassword(req, res, next) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword?.trim() || !newPassword?.trim()) {
    return res.status(400).json({
      message: "Current password and new password are required."
    });
  }

  if (newPassword.trim().length < 8) {
    return res.status(400).json({
      message: "New password must be at least 8 characters long."
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT id, full_name, email, role, created_at, password_hash
        FROM users
        WHERE id = $1
      `,
      [req.auth.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const userRecord = result.rows[0];
    const isValidPassword = await verifyPassword(currentPassword.trim(), userRecord.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Current password is incorrect."
      });
    }

    const passwordHash = await hashPassword(newPassword.trim());

    await pool.query(
      `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
      `,
      [passwordHash, req.auth.userId]
    );

    res.json({
      message: "Password changed successfully."
    });
  } catch (error) {
    next(error);
  }
}

export function registerStudent(req, res, next) {
  return registerUser(req, res, next, "student");
}

export function loginStudent(req, res, next) {
  return loginUser(req, res, next, "student");
}

export function registerAdmin(req, res, next) {
  return registerUser(req, res, next, "admin");
}

export function loginAdmin(req, res, next) {
  return loginUser(req, res, next, "admin");
}

export async function resetStudentPassword(req, res, next) {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword?.trim()) {
    return res.status(400).json({
      message: "New password is required."
    });
  }

  if (newPassword.trim().length < 8) {
    return res.status(400).json({
      message: "New password must be at least 8 characters long."
    });
  }

  try {
    const userResult = await pool.query(
      `
        SELECT id, role, full_name, email
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const targetUser = userResult.rows[0];

    if (targetUser.role !== "student") {
      return res.status(400).json({
        message: "Only student passwords can be reset by admins."
      });
    }

    const passwordHash = await hashPassword(newPassword.trim());

    await pool.query(
      `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
      `,
      [passwordHash, userId]
    );

    await pool.query(
      `
        INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, details)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        req.auth.userId,
        "reset_password",
        "user",
        userId,
        JSON.stringify({ email: targetUser.email, full_name: targetUser.full_name })
      ]
    );

    res.json({
      message: `Password for ${targetUser.full_name} has been reset successfully.`
    });
  } catch (error) {
    next(error);
  }
}

export function registerFaculty(req, res, next) {
  return registerUser(req, res, next, "faculty");
}

export function loginFaculty(req, res, next) {
  return loginUser(req, res, next, "faculty");
}
