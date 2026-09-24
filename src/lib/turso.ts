import { createClient, type Client } from '@libsql/client';

let tursoClientInstance: Client | null = null;
let isInitialized = false;

export function getTursoClient(): Client {
  if (!tursoClientInstance) {
    const url = process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.trim() !== ''
      ? process.env.TURSO_DATABASE_URL
      : 'file:jit_codearena_local.db';

    const authToken = process.env.TURSO_AUTH_TOKEN && process.env.TURSO_AUTH_TOKEN.trim() !== ''
      ? process.env.TURSO_AUTH_TOKEN
      : undefined;

    tursoClientInstance = createClient({
      url,
      authToken,
    });
  }
  return tursoClientInstance;
}

export async function initTursoDb(): Promise<void> {
  if (isInitialized) return;
  const client = getTursoClient();

  const migrations = [
    `CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      register_number TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      department TEXT NOT NULL,
      year INTEGER NOT NULL,
      section TEXT DEFAULT 'A',
      phone TEXT,
      password_hash TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS student_presence (
      student_id TEXT PRIMARY KEY,
      register_number TEXT NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL,
      year INTEGER NOT NULL,
      section TEXT DEFAULT 'A',
      current_page TEXT,
      active_assessment_id TEXT,
      current_question_index INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      violation_count INTEGER DEFAULT 0,
      session_status TEXT DEFAULT 'ONLINE',
      last_seen INTEGER NOT NULL,
      started_at INTEGER,
      user_agent TEXT,
      ip_address TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      code TEXT,
      instructions TEXT,
      duration INTEGER NOT NULL DEFAULT 60,
      total_marks INTEGER NOT NULL DEFAULT 100,
      passing_marks INTEGER NOT NULL DEFAULT 40,
      start_time TEXT,
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      marks INTEGER NOT NULL DEFAULT 20,
      initial_code TEXT,
      solution_code TEXT,
      test_cases TEXT NOT NULL DEFAULT '[]',
      time_limit INTEGER DEFAULT 2000,
      memory_limit INTEGER DEFAULT 128,
      order_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS test_attempts (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      score INTEGER DEFAULT 0,
      max_score INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress',
      tab_switches INTEGER DEFAULT 0,
      fullscreen_exits INTEGER DEFAULT 0,
      violation_count INTEGER DEFAULT 0,
      answers TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      code TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'python',
      status TEXT NOT NULL DEFAULT 'pending',
      execution_time REAL DEFAULT 0,
      memory_used INTEGER DEFAULT 0,
      passed_test_cases INTEGER DEFAULT 0,
      total_test_cases INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      test_id TEXT,
      student_id TEXT NOT NULL,
      student_name TEXT,
      register_number TEXT,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      timestamp TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS login_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_role TEXT NOT NULL,
      register_number TEXT,
      full_name TEXT NOT NULL,
      login_time TEXT NOT NULL,
      logout_time TEXT,
      last_active TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT DEFAULT 'active'
    );`
  ];

  for (const query of migrations) {
    try {
      await client.execute(query);
    } catch (err) {
      console.error('Turso migration error on query:', query, err);
    }
  }

  try {
    await client.execute('ALTER TABLE students ADD COLUMN is_archived INTEGER DEFAULT 0;');
  } catch {
    // Column already exists
  }

  isInitialized = true;
}

// -------------------------------------------------------------
// STUDENT REPOSITORY
// -------------------------------------------------------------
export async function getStudentsFromDb() {
  await initTursoDb();
  const client = getTursoClient();
  const res = await client.execute('SELECT * FROM students ORDER BY register_number ASC');
  return res.rows.map((row: any) => ({
    id: String(row.id),
    email: String(row.email),
    full_name: String(row.full_name),
    role: 'student' as const,
    register_number: String(row.register_number),
    department: String(row.department),
    year: Number(row.year),
    section: String(row.section || 'A'),
    phone: row.phone ? String(row.phone) : undefined,
    status: (row.status as 'active' | 'disabled' | 'suspended') || 'active',
    created_at: String(row.created_at),
  }));
}

export async function findStudentByRegNo(registerNumber: string) {
  await initTursoDb();
  const client = getTursoClient();
  const res = await client.execute({
    sql: 'SELECT * FROM students WHERE UPPER(register_number) = UPPER(?) LIMIT 1',
    args: [registerNumber.trim().toUpperCase()],
  });
  if (res.rows.length === 0) return null;
  const row: any = res.rows[0];
  return {
    id: String(row.id),
    email: String(row.email),
    full_name: String(row.full_name),
    role: 'student' as const,
    register_number: String(row.register_number),
    department: String(row.department),
    year: Number(row.year),
    section: String(row.section || 'A'),
    phone: row.phone ? String(row.phone) : undefined,
    password_hash: row.password_hash ? String(row.password_hash) : undefined,
    status: (row.status as 'active' | 'disabled' | 'suspended' | 'archived') || 'active',
    created_at: String(row.created_at),
  };
}

export async function upsertStudentInDb(student: {
  id: string;
  register_number: string;
  full_name: string;
  email: string;
  department: string;
  year: number;
  section?: string;
  phone?: string;
  password_hash?: string;
  status?: string;
}) {
  await initTursoDb();
  const client = getTursoClient();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO students (id, register_number, full_name, email, department, year, section, phone, password_hash, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(register_number) DO UPDATE SET
            full_name = excluded.full_name,
            email = excluded.email,
            department = excluded.department,
            year = excluded.year,
            section = excluded.section,
            phone = excluded.phone,
            password_hash = COALESCE(excluded.password_hash, students.password_hash),
            status = excluded.status,
            updated_at = excluded.updated_at`,
    args: [
      student.id,
      student.register_number.toUpperCase(),
      student.full_name,
      student.email,
      student.department,
      student.year,
      student.section || 'A',
      student.phone || null,
      student.password_hash || null,
      student.status || 'active',
      now,
      now,
    ],
  });
  return true;
}

export async function getStudentsWithDetails() {
  await initTursoDb();
  const client = getTursoClient();
  const res = await client.execute('SELECT * FROM students ORDER BY register_number ASC');
  const students = [];

  for (const row of res.rows) {
    const studentId = String(row.id);
    const regNo = String(row.register_number);

    // Test attempts count and scores
    const attRes = await client.execute({
      sql: 'SELECT COUNT(*) as count, AVG(score) as avg_score, MAX(score) as max_score FROM test_attempts WHERE student_id = ?',
      args: [studentId],
    });
    const attemptsCount = Number(attRes.rows[0]?.count || 0);
    const rawAvg = attRes.rows[0]?.avg_score;
    const rawMax = attRes.rows[0]?.max_score;
    const avgScore = rawAvg !== null && rawAvg !== undefined ? Math.round(Number(rawAvg)) : null;
    const maxScore = rawMax !== null && rawMax !== undefined ? Math.round(Number(rawMax)) : null;

    // Last login from login_activity
    const logRes = await client.execute({
      sql: 'SELECT login_time FROM login_activity WHERE user_id = ? OR UPPER(register_number) = UPPER(?) ORDER BY login_time DESC LIMIT 1',
      args: [studentId, regNo],
    });
    const lastLogin = logRes.rows[0]?.login_time ? String(logRes.rows[0]?.login_time) : null;

    students.push({
      id: studentId,
      email: String(row.email),
      full_name: String(row.full_name),
      role: 'student' as const,
      register_number: regNo,
      department: String(row.department),
      year: Number(row.year),
      section: String(row.section || 'A'),
      phone: row.phone ? String(row.phone) : undefined,
      status: (row.status as 'active' | 'disabled' | 'archived') || 'active',
      is_archived: Number(row.is_archived || 0) === 1,
      created_at: String(row.created_at),
      updated_at: row.updated_at ? String(row.updated_at) : undefined,
      attempts_count: attemptsCount,
      average_score: avgScore,
      max_score: maxScore,
      last_login: lastLogin,
    });
  }
  return students;
}

export async function getStudentProfileDetails(studentId: string) {
  await initTursoDb();
  const client = getTursoClient();

  // 1. Fetch student
  const sRes = await client.execute({
    sql: 'SELECT * FROM students WHERE id = ? LIMIT 1',
    args: [studentId],
  });
  if (sRes.rows.length === 0) return null;
  const s: any = sRes.rows[0];

  // 2. Fetch attempts with test details
  const attRes = await client.execute({
    sql: `SELECT ta.*, t.title as test_title, t.code as test_code, t.duration as test_duration
          FROM test_attempts ta
          LEFT JOIN tests t ON ta.test_id = t.id
          WHERE ta.student_id = ?
          ORDER BY ta.created_at DESC`,
    args: [studentId],
  });

  const attempts = attRes.rows.map((r: any) => ({
    id: String(r.id),
    test_id: String(r.test_id),
    test_title: String(r.test_title || 'Assessment'),
    test_code: r.test_code ? String(r.test_code) : undefined,
    test_duration: Number(r.test_duration || 60),
    score: Number(r.score || 0),
    max_score: Number(r.max_score || 100),
    status: String(r.status || 'in_progress'),
    start_time: String(r.start_time),
    end_time: r.end_time ? String(r.end_time) : null,
    tab_switches: Number(r.tab_switches || 0),
    fullscreen_exits: Number(r.fullscreen_exits || 0),
    violation_count: Number(r.violation_count || 0),
    created_at: String(r.created_at),
  }));

  // 3. Submissions summary
  const subRes = await client.execute({
    sql: 'SELECT COUNT(*) as total_sub, SUM(CASE WHEN status = "Accepted" THEN 1 ELSE 0 END) as accepted_sub FROM submissions WHERE student_id = ?',
    args: [studentId],
  });
  const totalSubmissions = Number(subRes.rows[0]?.total_sub || 0);
  const acceptedSubmissions = Number(subRes.rows[0]?.accepted_sub || 0);

  // 4. Activity Logs for this student
  const logsRes = await client.execute({
    sql: 'SELECT * FROM activity_logs WHERE student_id = ? OR register_number = ? ORDER BY timestamp DESC LIMIT 25',
    args: [studentId, s.register_number],
  });
  const logs = logsRes.rows.map((l: any) => ({
    id: String(l.id),
    test_id: l.test_id ? String(l.test_id) : null,
    event_type: String(l.event_type),
    description: String(l.description),
    metadata: l.metadata ? JSON.parse(String(l.metadata)) : {},
    timestamp: String(l.timestamp),
  }));

  // 5. Last Login
  const loginRes = await client.execute({
    sql: 'SELECT * FROM login_activity WHERE user_id = ? OR register_number = ? ORDER BY login_time DESC LIMIT 1',
    args: [studentId, s.register_number],
  });
  const lastLoginRow: any = loginRes.rows[0] || null;

  // Compute statistics
  const completedAttempts = attempts.filter(
    (a) => a.status === 'completed' || a.status === 'submitted' || a.status === 'auto_submitted'
  );
  const avgScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((acc, a) => acc + a.score, 0) / completedAttempts.length)
    : 0;
  const highestScore = attempts.length > 0
    ? Math.max(...attempts.map((a) => a.score))
    : 0;

  return {
    student: {
      id: String(s.id),
      email: String(s.email),
      full_name: String(s.full_name),
      role: 'student' as const,
      register_number: String(s.register_number),
      department: String(s.department),
      year: Number(s.year),
      section: String(s.section || 'A'),
      phone: s.phone ? String(s.phone) : undefined,
      status: (s.status as 'active' | 'disabled' | 'archived') || 'active',
      is_archived: Number(s.is_archived || 0) === 1,
      created_at: String(s.created_at),
      updated_at: s.updated_at ? String(s.updated_at) : undefined,
      last_login: lastLoginRow ? String(lastLoginRow.login_time) : null,
      last_ip: lastLoginRow?.ip_address ? String(lastLoginRow.ip_address) : '127.0.0.1',
    },
    stats: {
      tests_attempted: attempts.length,
      tests_completed: completedAttempts.length,
      average_score: avgScore,
      highest_score: highestScore,
      problems_solved: acceptedSubmissions,
      total_submissions: totalSubmissions,
    },
    recent_assessments: attempts.slice(0, 10),
    recent_activity: logs,
  };
}

export async function checkStudentExamHistory(studentId: string) {
  await initTursoDb();
  const client = getTursoClient();

  const [attRes, subRes, logsRes] = await Promise.all([
    client.execute({ sql: 'SELECT COUNT(*) as count FROM test_attempts WHERE student_id = ?', args: [studentId] }),
    client.execute({ sql: 'SELECT COUNT(*) as count FROM submissions WHERE student_id = ?', args: [studentId] }),
    client.execute({ sql: 'SELECT COUNT(*) as count FROM activity_logs WHERE student_id = ?', args: [studentId] }),
  ]);

  const attemptsCount = Number(attRes.rows[0]?.count || 0);
  const submissionsCount = Number(subRes.rows[0]?.count || 0);
  const logsCount = Number(logsRes.rows[0]?.count || 0);

  return {
    hasHistory: attemptsCount > 0 || submissionsCount > 0,
    attemptsCount,
    submissionsCount,
    logsCount,
  };
}

export async function updateStudentDetails(
  studentId: string,
  updates: {
    full_name?: string;
    register_number?: string;
    department?: string;
    year?: number;
    section?: string;
  },
  adminInfo?: { name?: string; role?: string }
) {
  await initTursoDb();
  const client = getTursoClient();

  // 1. Fetch current
  const sRes = await client.execute({ sql: 'SELECT * FROM students WHERE id = ? LIMIT 1', args: [studentId] });
  if (sRes.rows.length === 0) throw new Error('Student not found');
  const current: any = sRes.rows[0];

  const now = new Date().toISOString();
  const newRegNo = updates.register_number ? updates.register_number.trim().toUpperCase() : current.register_number;

  // 2. Check uniqueness if register_number is changing
  if (newRegNo !== current.register_number) {
    const dupRes = await client.execute({
      sql: 'SELECT id FROM students WHERE UPPER(register_number) = ? AND id != ? LIMIT 1',
      args: [newRegNo, studentId],
    });
    if (dupRes.rows.length > 0) {
      throw new Error(`Register Number "${newRegNo}" is already assigned to another student.`);
    }
  }

  const newName = updates.full_name ? updates.full_name.trim() : current.full_name;
  const newDept = updates.department ? updates.department.trim() : current.department;
  const newYear = updates.year !== undefined ? Number(updates.year) : Number(current.year);
  const newSection = updates.section ? updates.section.trim().toUpperCase() : (current.section || 'A');
  const newEmail = `${newRegNo.toLowerCase()}@student.jit.edu`;

  // 3. Update students table
  await client.execute({
    sql: `UPDATE students SET
            full_name = ?,
            register_number = ?,
            email = ?,
            department = ?,
            year = ?,
            section = ?,
            updated_at = ?
          WHERE id = ?`,
    args: [newName, newRegNo, newEmail, newDept, newYear, newSection, now, studentId],
  });

  // 4. Also update presence table if exists
  await client.execute({
    sql: `UPDATE student_presence SET
            full_name = ?,
            register_number = ?,
            department = ?,
            year = ?,
            section = ?
          WHERE student_id = ?`,
    args: [newName, newRegNo, newDept, newYear, newSection, studentId],
  });

  // 5. Record audit log
  const prevValues = {
    full_name: current.full_name,
    register_number: current.register_number,
    department: current.department,
    year: current.year,
    section: current.section || 'A',
  };
  const newValues = {
    full_name: newName,
    register_number: newRegNo,
    department: newDept,
    year: newYear,
    section: newSection,
  };

  const adminName = adminInfo?.name || 'Administrator';
  await recordActivityLogInDb({
    student_id: studentId,
    student_name: newName,
    register_number: newRegNo,
    event_type: 'STUDENT_UPDATED',
    description: `${adminName} updated academic profile for ${newRegNo} (${newName})`,
    metadata: { previous: prevValues, updated: newValues, admin: adminInfo },
  });

  return {
    id: studentId,
    full_name: newName,
    register_number: newRegNo,
    email: newEmail,
    department: newDept,
    year: newYear,
    section: newSection,
    updated_at: now,
  };
}

export async function setStudentStatus(
  studentId: string,
  newStatus: 'active' | 'disabled' | 'archived',
  adminInfo?: { name?: string; role?: string }
) {
  await initTursoDb();
  const client = getTursoClient();

  const sRes = await client.execute({ sql: 'SELECT * FROM students WHERE id = ? LIMIT 1', args: [studentId] });
  if (sRes.rows.length === 0) throw new Error('Student not found');
  const current: any = sRes.rows[0];

  const now = new Date().toISOString();
  const isArchived = newStatus === 'archived' ? 1 : 0;

  await client.execute({
    sql: 'UPDATE students SET status = ?, is_archived = ?, updated_at = ? WHERE id = ?',
    args: [newStatus, isArchived, now, studentId],
  });

  if (newStatus === 'disabled' || newStatus === 'archived') {
    await client.execute({
      sql: 'UPDATE student_presence SET session_status = "OFFLINE", active_assessment_id = null WHERE student_id = ?',
      args: [studentId],
    });
  }

  const eventType =
    newStatus === 'disabled'
      ? 'STUDENT_DISABLED'
      : newStatus === 'archived'
      ? 'STUDENT_ARCHIVED'
      : 'STUDENT_ENABLED';

  const adminName = adminInfo?.name || 'Administrator';
  await recordActivityLogInDb({
    student_id: studentId,
    student_name: current.full_name,
    register_number: current.register_number,
    event_type: eventType,
    description: `${adminName} changed account status of ${current.register_number} (${current.full_name}) to ${newStatus.toUpperCase()}`,
    metadata: { previousStatus: current.status, newStatus, admin: adminInfo },
  });

  return { studentId, status: newStatus, is_archived: isArchived === 1 };
}

export async function resetStudentPassword(
  studentId: string,
  newPassword: string,
  adminInfo?: { name?: string; role?: string }
) {
  await initTursoDb();
  const client = getTursoClient();

  const sRes = await client.execute({ sql: 'SELECT * FROM students WHERE id = ? LIMIT 1', args: [studentId] });
  if (sRes.rows.length === 0) throw new Error('Student not found');
  const current: any = sRes.rows[0];

  const now = new Date().toISOString();
  await client.execute({
    sql: 'UPDATE students SET password_hash = ?, updated_at = ? WHERE id = ?',
    args: [newPassword, now, studentId],
  });

  const adminName = adminInfo?.name || 'Administrator';
  await recordActivityLogInDb({
    student_id: studentId,
    student_name: current.full_name,
    register_number: current.register_number,
    event_type: 'PASSWORD_RESET',
    description: `${adminName} initiated security password reset for student ${current.register_number}`,
    metadata: { admin: adminInfo },
  });

  return { success: true };
}

export async function deleteOrArchiveStudentInDb(
  studentId: string,
  adminInfo?: { name?: string; role?: string }
) {
  await initTursoDb();
  const client = getTursoClient();

  const sRes = await client.execute({ sql: 'SELECT * FROM students WHERE id = ? LIMIT 1', args: [studentId] });
  if (sRes.rows.length === 0) throw new Error('Student not found');
  const current: any = sRes.rows[0];

  const history = await checkStudentExamHistory(studentId);

  if (history.hasHistory) {
    // Has examination records -> Safe Archive
    await setStudentStatus(studentId, 'archived', adminInfo);
    return {
      action: 'archived',
      message: `Student "${current.full_name}" (${current.register_number}) has ${history.attemptsCount} examination attempts and ${history.submissionsCount} submissions. The account was safely archived; historical exam records remain preserved.`,
    };
  } else {
    // 0 history -> Safe permanent delete
    await client.execute({ sql: 'DELETE FROM student_presence WHERE student_id = ?', args: [studentId] });
    await client.execute({ sql: 'DELETE FROM login_activity WHERE user_id = ? OR register_number = ?', args: [studentId, current.register_number] });
    await client.execute({ sql: 'DELETE FROM activity_logs WHERE student_id = ?', args: [studentId] });
    await client.execute({ sql: 'DELETE FROM students WHERE id = ?', args: [studentId] });

    const adminName = adminInfo?.name || 'Administrator';
    await recordActivityLogInDb({
      student_id: studentId,
      student_name: current.full_name,
      register_number: current.register_number,
      event_type: 'STUDENT_DELETED',
      description: `${adminName} permanently deleted candidate ${current.register_number} (${current.full_name}). Zero historical records found.`,
      metadata: { admin: adminInfo },
    });

    return {
      action: 'deleted',
      message: `Candidate "${current.full_name}" (${current.register_number}) was permanently deleted from the institution database.`,
    };
  }
}

export async function bulkUpdateStudentsInDb(
  studentIds: string[],
  action: 'disable' | 'enable' | 'archive',
  adminInfo?: { name?: string; role?: string }
) {
  const targetStatus = action === 'disable' ? 'disabled' : action === 'archive' ? 'archived' : 'active';
  const results = [];
  for (const id of studentIds) {
    try {
      const res = await setStudentStatus(id, targetStatus, adminInfo);
      results.push(res);
    } catch (err) {
      console.warn(`Bulk update error on student ${id}:`, err);
    }
  }
  return { success: true, count: results.length };
}

// -------------------------------------------------------------
// LOGIN ACTIVITY
// -------------------------------------------------------------
export async function recordLoginActivityInDb(entry: {
  id: string;
  user_id: string;
  user_role: string;
  register_number?: string;
  full_name: string;
  ip_address?: string;
  user_agent?: string;
}) {
  await initTursoDb();
  const client = getTursoClient();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO login_activity (id, user_id, user_role, register_number, full_name, login_time, last_active, ip_address, user_agent, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    args: [
      entry.id,
      entry.user_id,
      entry.user_role,
      entry.register_number || 'ADMIN',
      entry.full_name,
      now,
      now,
      entry.ip_address || '127.0.0.1',
      entry.user_agent || 'Browser',
    ],
  });
}

export async function getLoginActivityFromDb(limit = 100) {
  await initTursoDb();
  const client = getTursoClient();
  const res = await client.execute({
    sql: `SELECT * FROM login_activity ORDER BY login_time DESC LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    user_role: String(row.user_role),
    register_number: String(row.register_number || ''),
    full_name: String(row.full_name),
    login_time: String(row.login_time),
    logout_time: row.logout_time ? String(row.logout_time) : null,
    last_active: String(row.last_active),
    ip_address: String(row.ip_address || ''),
    user_agent: String(row.user_agent || ''),
    status: String(row.status || 'active'),
  }));
}

// -------------------------------------------------------------
// PRESENCE & HEARTBEAT
// -------------------------------------------------------------
export async function updateHeartbeatInDb(data: {
  student_id: string;
  register_number: string;
  full_name: string;
  department: string;
  year: number;
  section?: string;
  current_page?: string;
  active_assessment_id?: string;
  current_question_index?: number;
  total_questions?: number;
  violation_count?: number;
  user_agent?: string;
  ip_address?: string;
}) {
  await initTursoDb();
  const client = getTursoClient();
  const now = Date.now();

  await client.execute({
    sql: `INSERT INTO student_presence (
            student_id, register_number, full_name, department, year, section,
            current_page, active_assessment_id, current_question_index, total_questions,
            violation_count, session_status, last_seen, started_at, user_agent, ip_address
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(student_id) DO UPDATE SET
            register_number = excluded.register_number,
            full_name = excluded.full_name,
            department = excluded.department,
            year = excluded.year,
            section = excluded.section,
            current_page = excluded.current_page,
            active_assessment_id = excluded.active_assessment_id,
            current_question_index = excluded.current_question_index,
            total_questions = excluded.total_questions,
            violation_count = excluded.violation_count,
            session_status = excluded.session_status,
            last_seen = excluded.last_seen,
            user_agent = excluded.user_agent,
            ip_address = excluded.ip_address`,
    args: [
      data.student_id,
      data.register_number.toUpperCase(),
      data.full_name,
      data.department,
      data.year,
      data.section || 'A',
      data.current_page || '/student/dashboard',
      data.active_assessment_id || null,
      data.current_question_index || 0,
      data.total_questions || 0,
      data.violation_count || 0,
      data.active_assessment_id ? 'IN_ASSESSMENT' : 'ONLINE',
      now,
      now,
      data.user_agent || '',
      data.ip_address || '',
    ],
  });
}

export async function getPresenceListFromDb() {
  await initTursoDb();
  const client = getTursoClient();
  const res = await client.execute('SELECT * FROM student_presence ORDER BY last_seen DESC');
  const now = Date.now();

  return res.rows.map((row: any) => {
    const lastSeen = Number(row.last_seen);
    const diffMs = now - lastSeen;
    const violations = Number(row.violation_count || 0);
    const hasActiveAssessment = Boolean(row.active_assessment_id);

    let computedStatus: 'ONLINE' | 'IDLE' | 'IN_ASSESSMENT' | 'WARNING' | 'OFFLINE' = 'OFFLINE';

    if (diffMs > 90000) {
      computedStatus = 'OFFLINE';
    } else if (violations > 0 && hasActiveAssessment) {
      computedStatus = 'WARNING';
    } else if (hasActiveAssessment) {
      computedStatus = 'IN_ASSESSMENT';
    } else if (diffMs > 45000) {
      computedStatus = 'IDLE';
    } else {
      computedStatus = 'ONLINE';
    }

    return {
      student_id: String(row.student_id),
      register_number: String(row.register_number),
      full_name: String(row.full_name),
      department: String(row.department),
      year: Number(row.year),
      section: String(row.section || 'A'),
      current_page: String(row.current_page || ''),
      active_assessment_id: row.active_assessment_id ? String(row.active_assessment_id) : null,
      current_question_index: Number(row.current_question_index || 0),
      total_questions: Number(row.total_questions || 0),
      violation_count: violations,
      session_status: computedStatus,
      last_seen: lastSeen,
      started_at: row.started_at ? Number(row.started_at) : null,
      user_agent: String(row.user_agent || ''),
      ip_address: String(row.ip_address || ''),
    };
  });
}

// -------------------------------------------------------------
// ASSESSMENT CRUD & SAFE ARCHIVING
// -------------------------------------------------------------
export async function getAssessmentsFromDb(includeArchived = false) {
  await initTursoDb();
  const client = getTursoClient();
  const sql = includeArchived
    ? 'SELECT * FROM tests ORDER BY created_at DESC'
    : 'SELECT * FROM tests WHERE is_archived = 0 ORDER BY created_at DESC';
  const testsRes = await client.execute(sql);

  const tests = [];
  for (const row of testsRes.rows) {
    const id = String(row.id);
    // Count questions
    const qCountRes = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM questions WHERE test_id = ?',
      args: [id],
    });
    const questionCount = Number(qCountRes.rows[0]?.count || 0);

    // Count participants/attempts
    const aCountRes = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM test_attempts WHERE test_id = ?',
      args: [id],
    });
    const participantCount = Number(aCountRes.rows[0]?.count || 0);

    tests.push({
      id,
      title: String(row.title),
      description: row.description ? String(row.description) : '',
      code: row.code ? String(row.code) : '',
      instructions: row.instructions ? String(row.instructions) : '',
      duration: Number(row.duration || 60),
      duration_minutes: Number(row.duration || 60),
      total_marks: Number(row.total_marks || 100),
      passing_marks: Number(row.passing_marks || 40),
      start_time: row.start_time ? String(row.start_time) : '',
      end_time: row.end_time ? String(row.end_time) : '',
      status: String(row.status || 'draft'),
      is_archived: Number(row.is_archived || 0) === 1,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      question_count: questionCount,
      participant_count: participantCount,
    });
  }

  return tests;
}

export async function getAssessmentWithQuestions(id: string) {
  await initTursoDb();
  const client = getTursoClient();
  const testRes = await client.execute({
    sql: 'SELECT * FROM tests WHERE id = ?',
    args: [id],
  });
  if (testRes.rows.length === 0) return null;
  const testRow: any = testRes.rows[0];

  const qRes = await client.execute({
    sql: 'SELECT * FROM questions WHERE test_id = ? ORDER BY order_index ASC, created_at ASC',
    args: [id],
  });

  const questions = qRes.rows.map((q: any) => ({
    id: String(q.id),
    test_id: String(q.test_id),
    title: String(q.title),
    description: String(q.description),
    difficulty: String(q.difficulty),
    marks: Number(q.marks),
    initial_code: q.initial_code ? String(q.initial_code) : '',
    solution_code: q.solution_code ? String(q.solution_code) : '',
    test_cases: q.test_cases ? JSON.parse(String(q.test_cases)) : [],
    time_limit: Number(q.time_limit || 2000),
    memory_limit: Number(q.memory_limit || 128),
    order_index: Number(q.order_index || 0),
    created_at: String(q.created_at),
  }));

  const aCountRes = await client.execute({
    sql: 'SELECT COUNT(*) as count FROM test_attempts WHERE test_id = ?',
    args: [id],
  });
  const participantCount = Number(aCountRes.rows[0]?.count || 0);

  return {
    id: String(testRow.id),
    title: String(testRow.title),
    description: testRow.description ? String(testRow.description) : '',
    code: testRow.code ? String(testRow.code) : '',
    instructions: testRow.instructions ? String(testRow.instructions) : '',
    duration: Number(testRow.duration || 60),
    duration_minutes: Number(testRow.duration || 60),
    total_marks: Number(testRow.total_marks || 100),
    passing_marks: Number(testRow.passing_marks || 40),
    start_time: testRow.start_time ? String(testRow.start_time) : '',
    end_time: testRow.end_time ? String(testRow.end_time) : '',
    status: String(testRow.status || 'draft'),
    is_archived: Number(testRow.is_archived || 0) === 1,
    created_at: String(testRow.created_at),
    updated_at: String(testRow.updated_at),
    participant_count: participantCount,
    questions,
  };
}

export async function createAssessmentInDb(data: {
  id?: string;
  title: string;
  description?: string;
  code?: string;
  instructions?: string;
  duration?: number;
  total_marks?: number;
  passing_marks?: number;
  start_time?: string;
  end_time?: string;
  status?: string;
  questions?: Array<{
    title: string;
    description: string;
    difficulty?: string;
    marks?: number;
    initial_code?: string;
    solution_code?: string;
    test_cases?: any[];
  }>;
}) {
  await initTursoDb();
  const client = getTursoClient();
  const testId = data.id || `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO tests (id, title, description, code, instructions, duration, total_marks, passing_marks, start_time, end_time, status, is_archived, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    args: [
      testId,
      data.title,
      data.description || '',
      data.code || `TEST-${Date.now().toString().slice(-4)}`,
      data.instructions || 'Ensure fullscreen remains active. Avoid switching tabs.',
      data.duration || 60,
      data.total_marks || 100,
      data.passing_marks || 40,
      data.start_time || null,
      data.end_time || null,
      data.status || 'draft',
      now,
      now,
    ],
  });

  if (data.questions && data.questions.length > 0) {
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      const qId = `q-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      await client.execute({
        sql: `INSERT INTO questions (id, test_id, title, description, difficulty, marks, initial_code, solution_code, test_cases, order_index, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          qId,
          testId,
          q.title,
          q.description,
          q.difficulty || 'medium',
          q.marks || 20,
          q.initial_code || 'def solution():\n    pass\n',
          q.solution_code || '',
          JSON.stringify(q.test_cases || []),
          i,
          now,
        ],
      });
    }
  }

  return getAssessmentWithQuestions(testId);
}

export async function updateAssessmentInDb(
  id: string,
  data: {
    title?: string;
    description?: string;
    code?: string;
    instructions?: string;
    duration?: number;
    total_marks?: number;
    passing_marks?: number;
    start_time?: string;
    end_time?: string;
    status?: string;
    questions?: Array<{
      id?: string;
      title: string;
      description: string;
      difficulty?: string;
      marks?: number;
      initial_code?: string;
      solution_code?: string;
      test_cases?: any[];
    }>;
  }
) {
  await initTursoDb();
  const client = getTursoClient();
  const now = new Date().toISOString();

  // Check attempt count
  const aCountRes = await client.execute({
    sql: 'SELECT COUNT(*) as count FROM test_attempts WHERE test_id = ?',
    args: [id],
  });
  const attemptsCount = Number(aCountRes.rows[0]?.count || 0);

  const updates: string[] = ['updated_at = ?'];
  const args: any[] = [now];

  if (data.title !== undefined) {
    updates.push('title = ?');
    args.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    args.push(data.description);
  }
  if (data.code !== undefined) {
    updates.push('code = ?');
    args.push(data.code);
  }
  if (data.instructions !== undefined) {
    updates.push('instructions = ?');
    args.push(data.instructions);
  }
  if (data.duration !== undefined) {
    updates.push('duration = ?');
    args.push(data.duration);
  }
  if (data.total_marks !== undefined) {
    updates.push('total_marks = ?');
    args.push(data.total_marks);
  }
  if (data.passing_marks !== undefined) {
    updates.push('passing_marks = ?');
    args.push(data.passing_marks);
  }
  if (data.start_time !== undefined) {
    updates.push('start_time = ?');
    args.push(data.start_time);
  }
  if (data.end_time !== undefined) {
    updates.push('end_time = ?');
    args.push(data.end_time);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    args.push(data.status);
  }

  args.push(id);
  await client.execute({
    sql: `UPDATE tests SET ${updates.join(', ')} WHERE id = ?`,
    args,
  });

  // If questions are provided and no active attempts, replace questions
  if (data.questions && data.questions.length > 0) {
    await client.execute({
      sql: 'DELETE FROM questions WHERE test_id = ?',
      args: [id],
    });
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      const qId = q.id || `q-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      await client.execute({
        sql: `INSERT INTO questions (id, test_id, title, description, difficulty, marks, initial_code, solution_code, test_cases, order_index, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          qId,
          id,
          q.title,
          q.description,
          q.difficulty || 'medium',
          q.marks || 20,
          q.initial_code || 'def solution():\n    pass\n',
          q.solution_code || '',
          JSON.stringify(q.test_cases || []),
          i,
          now,
        ],
      });
    }
  }

  return {
    assessment: await getAssessmentWithQuestions(id),
    had_active_attempts: attemptsCount > 0,
  };
}

export async function duplicateAssessmentInDb(id: string) {
  const source = await getAssessmentWithQuestions(id);
  if (!source) throw new Error('Assessment not found');

  const newTitle = `${source.title} (Copy)`;
  const newCode = `${source.code || 'TEST'}-COPY-${Date.now().toString().slice(-4)}`;

  return createAssessmentInDb({
    title: newTitle,
    description: source.description,
    code: newCode,
    instructions: source.instructions,
    duration: source.duration,
    total_marks: source.total_marks,
    passing_marks: source.passing_marks,
    status: 'draft',
    questions: source.questions.map((q) => ({
      title: q.title,
      description: q.description,
      difficulty: q.difficulty,
      marks: q.marks,
      initial_code: q.initial_code,
      solution_code: q.solution_code,
      test_cases: q.test_cases,
    })),
  });
}

export async function deleteOrArchiveAssessmentInDb(id: string) {
  await initTursoDb();
  const client = getTursoClient();

  // Check attempt count
  const aCountRes = await client.execute({
    sql: 'SELECT COUNT(*) as count FROM test_attempts WHERE test_id = ?',
    args: [id],
  });
  const attemptsCount = Number(aCountRes.rows[0]?.count || 0);

  if (attemptsCount > 0) {
    // Soft delete / archive to protect candidate records
    await client.execute({
      sql: "UPDATE tests SET is_archived = 1, status = 'archived', updated_at = ? WHERE id = ?",
      args: [new Date().toISOString(), id],
    });
    return {
      action: 'archived',
      message: `Assessment has ${attemptsCount} student attempt records. Safely archived to preserve institutional history.`,
    };
  } else {
    // Safe hard delete since no student records exist
    await client.execute({ sql: 'DELETE FROM questions WHERE test_id = ?', args: [id] });
    await client.execute({ sql: 'DELETE FROM tests WHERE id = ?', args: [id] });
    return {
      action: 'deleted',
      message: 'Assessment and all associated questions deleted successfully.',
    };
  }
}

// -------------------------------------------------------------
// ACTIVITY LOGS
// -------------------------------------------------------------
export async function recordActivityLogInDb(log: {
  id?: string;
  test_id?: string;
  student_id: string;
  student_name?: string;
  register_number?: string;
  event_type: string;
  description: string;
  metadata?: any;
}) {
  await initTursoDb();
  const client = getTursoClient();
  const logId = log.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO activity_logs (id, test_id, student_id, student_name, register_number, event_type, description, metadata, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      logId,
      log.test_id || null,
      log.student_id,
      log.student_name || null,
      log.register_number ? log.register_number.toUpperCase() : null,
      log.event_type,
      log.description,
      JSON.stringify(log.metadata || {}),
      now,
    ],
  });
}

export async function getActivityLogsFromDb(limit = 50, testId?: string) {
  await initTursoDb();
  const client = getTursoClient();
  const sql = testId
    ? 'SELECT * FROM activity_logs WHERE test_id = ? ORDER BY timestamp DESC LIMIT ?'
    : 'SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ?';
  const args = testId ? [testId, limit] : [limit];

  const res = await client.execute({ sql, args });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    test_id: row.test_id ? String(row.test_id) : null,
    student_id: String(row.student_id),
    student_name: row.student_name ? String(row.student_name) : 'Student',
    register_number: row.register_number ? String(row.register_number) : '',
    event_type: String(row.event_type),
    description: String(row.description),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : {},
    timestamp: String(row.timestamp),
    created_at: String(row.timestamp),
  }));
}

// -------------------------------------------------------------
// DASHBOARD STATS
// -------------------------------------------------------------
export async function getDashboardStatsFromDb() {
  await initTursoDb();
  const client = getTursoClient();

  const [studentsRes, presenceRes, attemptsRes, violationsRes] = await Promise.all([
    client.execute('SELECT COUNT(*) as count FROM students'),
    getPresenceListFromDb(),
    client.execute("SELECT COUNT(*) as count FROM test_attempts WHERE status = 'completed' OR status = 'submitted'"),
    client.execute('SELECT SUM(violation_count) as total_violations FROM student_presence'),
  ]);

  const totalStudents = Number(studentsRes.rows[0]?.count || 0);
  const onlineCount = presenceRes.filter((p) => p.session_status === 'ONLINE' || p.session_status === 'IN_ASSESSMENT' || p.session_status === 'WARNING').length;
  const inAssessmentCount = presenceRes.filter((p) => p.session_status === 'IN_ASSESSMENT' || p.session_status === 'WARNING').length;
  const completedAttempts = Number(attemptsRes.rows[0]?.count || 0);
  const totalViolations = Number(violationsRes.rows[0]?.total_violations || 0);

  const recentLogs = await getActivityLogsFromDb(20);

  return {
    totalStudents,
    onlineCount,
    inAssessmentCount,
    completedAttempts,
    totalViolations,
    recentLogs,
  };
}
