import { createClient, type Client } from '@libsql/client';
import crypto from 'crypto';

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

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  return `pbkdf2:10000:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;
  if (!storedHash.startsWith('pbkdf2:')) {
    // Backward compatibility for existing plaintext passwords
    return storedHash === password;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 4) return false;
  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const originalHash = parts[3];
  const calculatedHash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(calculatedHash, 'hex'));
  } catch {
    return false;
  }
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

    `CREATE TABLE IF NOT EXISTS attempt_questions (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      question_order INTEGER NOT NULL,
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
    );`,

    `CREATE TABLE IF NOT EXISTS code_executions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      attempt_id TEXT,
      question_id TEXT,
      source_code TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'python',
      execution_status TEXT NOT NULL,
      test_cases_passed INTEGER DEFAULT 0,
      test_cases_failed INTEGER DEFAULT 0,
      execution_time REAL DEFAULT 0,
      memory_used INTEGER DEFAULT 0,
      stdout TEXT,
      stderr TEXT,
      compile_output TEXT,
      created_at TEXT NOT NULL
    );`
  ];

  for (const query of migrations) {
    try {
      await client.execute(query);
    } catch (err) {
      console.error('Turso migration error on query:', query, err);
    }
  }

  const alters = [
    'ALTER TABLE students ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;',
    'ALTER TABLE students ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE students ADD COLUMN account_deleted INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE students ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1;',
    'ALTER TABLE questions ADD COLUMN year INTEGER NOT NULL DEFAULT 2;',
    "ALTER TABLE questions ADD COLUMN topic TEXT DEFAULT 'Algorithms';",
    "ALTER TABLE questions ADD COLUMN input_format TEXT DEFAULT '';",
    "ALTER TABLE questions ADD COLUMN output_format TEXT DEFAULT '';",
    "ALTER TABLE questions ADD COLUMN constraints TEXT DEFAULT '';",
    'ALTER TABLE tests ADD COLUMN year INTEGER NOT NULL DEFAULT 2;',
    'ALTER TABLE tests ADD COLUMN question_count INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE test_attempts ADD COLUMN question_seed TEXT;',
    'CREATE INDEX IF NOT EXISTS idx_questions_year ON questions(year);',
    'CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);',
    'CREATE INDEX IF NOT EXISTS idx_questions_year_test ON questions(year, test_id);',
    'CREATE INDEX IF NOT EXISTS idx_students_year ON students(year);',
    'CREATE INDEX IF NOT EXISTS idx_students_is_active ON students(is_active);',
    'CREATE INDEX IF NOT EXISTS idx_tests_year ON tests(year);',
    'CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);',
    'CREATE INDEX IF NOT EXISTS idx_attempt_questions_attempt ON attempt_questions(attempt_id);',
    'CREATE INDEX IF NOT EXISTS idx_attempt_questions_question ON attempt_questions(question_id);',
    'CREATE INDEX IF NOT EXISTS idx_attempt_questions_order ON attempt_questions(attempt_id, question_order);',
    'CREATE INDEX IF NOT EXISTS idx_test_attempts_student ON test_attempts(student_id);',
    'CREATE INDEX IF NOT EXISTS idx_test_attempts_test ON test_attempts(test_id);',
    'CREATE INDEX IF NOT EXISTS idx_test_attempts_student_test ON test_attempts(student_id, test_id);',
    'CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);',
    'CREATE INDEX IF NOT EXISTS idx_submissions_test ON submissions(test_id);',
    'CREATE INDEX IF NOT EXISTS idx_submissions_question ON submissions(question_id);',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_student ON activity_logs(student_id);',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_test ON activity_logs(test_id);',
    'CREATE INDEX IF NOT EXISTS idx_student_presence_last_seen ON student_presence(last_seen);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_students_reg_no_upper ON students(UPPER(TRIM(register_number)));',
    'ALTER TABLE test_attempts ADD COLUMN ends_at TEXT;',
    'ALTER TABLE submissions ADD COLUMN attempt_id TEXT;',
    'ALTER TABLE test_attempts ADD COLUMN percentage INTEGER DEFAULT 0;',
    'ALTER TABLE test_attempts ADD COLUMN time_taken_seconds INTEGER DEFAULT 0;',
    'ALTER TABLE test_attempts ADD COLUMN completion_rank INTEGER DEFAULT 1;',
    'ALTER TABLE test_attempts ADD COLUMN question_results TEXT DEFAULT "[]";',
    'CREATE INDEX IF NOT EXISTS idx_code_executions_student ON code_executions(student_id);',
    'CREATE INDEX IF NOT EXISTS idx_code_executions_attempt ON code_executions(attempt_id);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_tests_code_upper ON tests(UPPER(TRIM(code))) WHERE code IS NOT NULL AND TRIM(code) != "";',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_test_attempts_active_unique ON test_attempts(student_id, test_id) WHERE status = "in_progress" OR status = "not_started";',
    'ALTER TABLE questions ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE questions ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;',
    'ALTER TABLE questions ADD COLUMN starter_code TEXT;',
    'CREATE INDEX IF NOT EXISTS idx_questions_is_archived ON questions(is_archived);',
  ];

  for (const alt of alters) {
    try {
      await client.execute(alt);
    } catch {
      // Column or index already exists
    }
  }

  try {
    await client.execute('UPDATE students SET is_active = 1 WHERE is_active IS NULL');
    await client.execute('UPDATE students SET is_archived = 0 WHERE is_archived IS NULL');
    await client.execute('UPDATE students SET account_deleted = 0 WHERE account_deleted IS NULL');
    await client.execute('UPDATE students SET session_version = 1 WHERE session_version IS NULL');
  } catch {
    // safe non-blocking
  }

  isInitialized = true;
}

// -------------------------------------------------------------
// STUDENT REPOSITORY & SESSION VALIDATION
// -------------------------------------------------------------
export async function validateStudentAccountAndSession(
  studentId: string,
  sessionVersion?: number
): Promise<{
  valid: boolean;
  code: number;
  message: string;
  student?: any;
}> {
  await initTursoDb();
  const client = getTursoClient();

  if (!studentId || typeof studentId !== 'string') {
    return { valid: false, code: 401, message: 'Authentication required. Please log in.' };
  }

  const res = await client.execute({
    sql: `SELECT id, register_number, full_name, email, department, year, section, phone,
                 status, is_active, is_archived, account_deleted, session_version
          FROM students
          WHERE id = ? LIMIT 1`,
    args: [studentId],
  });

  if (res.rows.length === 0) {
    return { valid: false, code: 401, message: 'Your account is no longer active.' };
  }

  const student: any = res.rows[0];

  if (Number(student.account_deleted || 0) === 1) {
    return { valid: false, code: 401, message: 'Your account is no longer active.' };
  }

  if (Number(student.is_archived || 0) === 1 || student.status === 'archived') {
    return { valid: false, code: 401, message: 'Your account is no longer active.' };
  }

  if (Number(student.is_active ?? 1) === 0 || student.status === 'disabled' || student.status === 'suspended') {
    return { valid: false, code: 401, message: 'Your account has been disabled. Please contact the administrator.' };
  }

  if (sessionVersion !== undefined && sessionVersion !== null) {
    const clientVersion = Number(sessionVersion);
    const dbVersion = Number(student.session_version || 1);
    if (clientVersion !== dbVersion) {
      return { valid: false, code: 401, message: 'Your session has expired or was invalidated. Please log in again.' };
    }
  }

  return { valid: true, code: 200, message: 'Active', student };
}

export async function getStudentsFromDb() {
  await initTursoDb();
  const client = getTursoClient();
  const res = await client.execute(`
    SELECT * FROM students 
    WHERE (account_deleted = 0 OR account_deleted IS NULL)
      AND (is_archived = 0 OR is_archived IS NULL)
      AND (status != 'archived' OR status IS NULL)
    ORDER BY register_number ASC
  `);
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
    is_active: Number(row.is_active ?? 1) === 1,
    is_archived: Number(row.is_archived || 0) === 1,
    session_version: Number(row.session_version || 1),
    created_at: String(row.created_at),
  }));
}

export async function findStudentByRegNo(registerNumber: string) {
  await initTursoDb();
  const client = getTursoClient();
  const normalized = registerNumber.trim().toUpperCase();
  const res = await client.execute({
    sql: 'SELECT * FROM students WHERE UPPER(TRIM(register_number)) = ? LIMIT 1',
    args: [normalized],
  });
  if (res.rows.length === 0) return null;
  const row: any = res.rows[0];
  return {
    id: String(row.id),
    email: String(row.email),
    full_name: String(row.full_name),
    role: 'student' as const,
    register_number: String(row.register_number).trim().toUpperCase(),
    department: String(row.department),
    year: Number(row.year),
    section: String(row.section || 'A'),
    phone: row.phone ? String(row.phone) : undefined,
    password_hash: row.password_hash ? String(row.password_hash) : undefined,
    status: (row.status as 'active' | 'disabled' | 'suspended' | 'archived') || 'active',
    is_active: Number(row.is_active ?? 1) === 1,
    is_archived: Number(row.is_archived || 0) === 1,
    account_deleted: Number(row.account_deleted || 0) === 1,
    session_version: Number(row.session_version || 1),
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
  is_active?: number;
  is_archived?: number;
  account_deleted?: number;
  session_version?: number;
}) {
  await initTursoDb();
  const client = getTursoClient();
  const now = new Date().toISOString();
  const cleanRegNo = student.register_number.trim().toUpperCase();

  await client.execute({
    sql: `INSERT INTO students (
            id, register_number, full_name, email, department, year, section, phone,
            password_hash, status, is_active, is_archived, account_deleted, session_version,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(register_number) DO UPDATE SET
            full_name = excluded.full_name,
            email = excluded.email,
            department = excluded.department,
            year = excluded.year,
            section = excluded.section,
            phone = excluded.phone,
            password_hash = COALESCE(excluded.password_hash, students.password_hash),
            status = excluded.status,
            is_active = excluded.is_active,
            is_archived = excluded.is_archived,
            account_deleted = excluded.account_deleted,
            session_version = excluded.session_version,
            updated_at = excluded.updated_at`,
    args: [
      student.id,
      cleanRegNo,
      student.full_name.trim(),
      student.email,
      student.department.trim(),
      student.year,
      student.section || 'A',
      student.phone || null,
      student.password_hash || null,
      student.status || 'active',
      student.is_active ?? 1,
      student.is_archived ?? 0,
      student.account_deleted ?? 0,
      student.session_version ?? 1,
      now,
      now,
    ],
  });
  return true;
}

export async function getStudentsWithDetails() {
  await initTursoDb();
  const client = getTursoClient();
  const res = await client.execute(`
    SELECT * FROM students 
    WHERE (account_deleted = 0 OR account_deleted IS NULL)
      AND (is_archived = 0 OR is_archived IS NULL)
      AND (status != 'archived' OR status IS NULL)
    ORDER BY register_number ASC
  `);
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
      sql: 'SELECT login_time FROM login_activity WHERE user_id = ? OR UPPER(TRIM(register_number)) = UPPER(?) ORDER BY login_time DESC LIMIT 1',
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
      is_active: Number(row.is_active ?? 1) === 1,
      is_archived: Number(row.is_archived || 0) === 1,
      account_deleted: Number(row.account_deleted || 0) === 1,
      session_version: Number(row.session_version || 1),
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
    sql: "SELECT COUNT(*) as total_sub, SUM(CASE WHEN status = 'Accepted' THEN 1 ELSE 0 END) as accepted_sub FROM submissions WHERE student_id = ?",
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

  // 6. Proctoring Security History
  const presRes = await client.execute({
    sql: 'SELECT * FROM student_presence WHERE student_id = ? OR register_number = ? LIMIT 1',
    args: [studentId, s.register_number],
  });
  const presRow: any = presRes.rows[0] || null;

  const activeOrLatestAttempt = attempts[0] || null;
  const violationEventTypes = [
    'TAB_SWITCH',
    'FULLSCREEN_EXIT',
    'COPY',
    'PASTE',
    'CUT',
    'WINDOW_BLUR',
    'WARNING_TRIGGERED',
    'DEVTOOLS_OPEN',
    'RIGHT_CLICK',
    'DEV_TOOLS',
  ];

  const securityLogs = logs.filter(
    (l) =>
      violationEventTypes.includes(l.event_type.toUpperCase()) ||
      l.event_type.toUpperCase().includes('VIOLATION') ||
      l.event_type.toUpperCase().includes('TAB') ||
      l.event_type.toUpperCase().includes('FULLSCREEN')
  );

  const calculatedWarningCount = Math.min(
    3,
    presRow ? Number(presRow.violation_count || 0) : activeOrLatestAttempt ? Number(activeOrLatestAttempt.violation_count || 0) : 0
  );

  const securityHistory = {
    student_name: String(s.full_name),
    register_number: String(s.register_number),
    department: String(s.department),
    year: Number(s.year),
    assessment_title: activeOrLatestAttempt ? activeOrLatestAttempt.test_title : 'General Examination',
    assessment_status: activeOrLatestAttempt ? activeOrLatestAttempt.status.toUpperCase() : 'NO_ATTEMPTS',
    warning_count: calculatedWarningCount,
    max_warning_limit: 3,
    total_security_events: securityLogs.length,
    events: securityLogs.map((l) => {
      const d = new Date(l.timestamp);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return {
        formatted: `${hours}:${minutes}:${seconds} — ${l.event_type.toUpperCase()}`,
        event_type: l.event_type.toUpperCase(),
        timestamp: l.timestamp,
        time_formatted: `${hours}:${minutes}:${seconds}`,
        description: l.description,
        metadata: l.metadata,
      };
    }),
  };

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
    security_history: securityHistory,
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
  const isActive = newStatus === 'active' ? 1 : 0;

  // Invalidate any active session by bumping session_version
  await client.execute({
    sql: `UPDATE students SET
            status = ?,
            is_active = ?,
            is_archived = ?,
            session_version = session_version + 1,
            updated_at = ?
          WHERE id = ?`,
    args: [newStatus, isActive, isArchived, now, studentId],
  });

  // If disabling or archiving, immediately purge from live presence
  if (newStatus === 'disabled' || newStatus === 'archived') {
    await client.execute({
      sql: 'DELETE FROM student_presence WHERE student_id = ?',
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

  await recordActivityLogInDb({
    student_id: studentId,
    student_name: current.full_name,
    register_number: current.register_number,
    event_type: 'STUDENT_SESSION_INVALIDATED',
    description: `Active session tokens revoked for candidate ${current.register_number} following status change to ${newStatus}.`,
    metadata: { admin: adminInfo },
  });

  return { studentId, status: newStatus, is_active: isActive === 1, is_archived: isArchived === 1 };
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
  // Password reset also invalidates existing sessions
  await client.execute({
    sql: 'UPDATE students SET password_hash = ?, session_version = session_version + 1, updated_at = ? WHERE id = ?',
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

  await recordActivityLogInDb({
    student_id: studentId,
    student_name: current.full_name,
    register_number: current.register_number,
    event_type: 'STUDENT_SESSION_INVALIDATED',
    description: `Active session invalidated for ${current.register_number} following password reset.`,
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
  const adminName = adminInfo?.name || 'Administrator';
  const now = new Date().toISOString();

  if (history.hasHistory) {
    // Has examination records -> Safe Archive & Invalidate Session
    await client.execute({
      sql: `UPDATE students
            SET is_active = 0, is_archived = 1, status = 'archived',
                session_version = session_version + 1, updated_at = ?
            WHERE id = ?`,
      args: [now, studentId],
    });

    // Remove immediately from active presence
    await client.execute({ sql: 'DELETE FROM student_presence WHERE student_id = ?', args: [studentId] });

    await recordActivityLogInDb({
      student_id: studentId,
      student_name: current.full_name,
      register_number: current.register_number,
      event_type: 'STUDENT_ARCHIVED',
      description: `${adminName} safely archived candidate ${current.register_number} (${current.full_name}). Academic records preserved.`,
      metadata: { admin: adminInfo, attemptsCount: history.attemptsCount, submissionsCount: history.submissionsCount },
    });

    await recordActivityLogInDb({
      student_id: studentId,
      student_name: current.full_name,
      register_number: current.register_number,
      event_type: 'STUDENT_SESSION_INVALIDATED',
      description: `Active session credentials revoked for archived candidate ${current.register_number}.`,
      metadata: { admin: adminInfo },
    });

    return {
      action: 'archived',
      message: `Student "${current.full_name}" (${current.register_number}) has ${history.attemptsCount} examination attempts and ${history.submissionsCount} submissions. The account was safely archived and login access disabled; historical records remain preserved.`,
    };
  } else {
    // 0 history -> Safe permanent delete
    await client.execute({ sql: 'DELETE FROM student_presence WHERE student_id = ?', args: [studentId] });
    await client.execute({
      sql: 'DELETE FROM login_activity WHERE user_id = ? OR UPPER(TRIM(register_number)) = ?',
      args: [studentId, current.register_number.trim().toUpperCase()],
    });
    await client.execute({ sql: 'DELETE FROM activity_logs WHERE student_id = ?', args: [studentId] });
    await client.execute({ sql: 'DELETE FROM test_attempts WHERE student_id = ?', args: [studentId] });
    await client.execute({ sql: 'DELETE FROM students WHERE id = ?', args: [studentId] });

    await recordActivityLogInDb({
      student_id: studentId,
      student_name: current.full_name,
      register_number: current.register_number,
      event_type: 'STUDENT_DELETED',
      description: `${adminName} permanently deleted candidate ${current.register_number} (${current.full_name}). Zero historical records found.`,
      metadata: { admin: adminInfo },
    });

    await recordActivityLogInDb({
      student_id: studentId,
      student_name: current.full_name,
      register_number: current.register_number,
      event_type: 'STUDENT_SESSION_INVALIDATED',
      description: `All active sessions revoked for permanently deleted candidate ${current.register_number}.`,
      metadata: { admin: adminInfo },
    });

    return {
      action: 'deleted',
      message: `Candidate "${current.full_name}" (${current.register_number}) was permanently deleted from the institution database.`,
    };
  }
}

export async function purgeAllStudentDataFromDb() {
  await initTursoDb();
  const client = getTursoClient();

  const [stdCountRes, attCountRes, subCountRes] = await Promise.all([
    client.execute('SELECT COUNT(*) as count FROM students'),
    client.execute('SELECT COUNT(*) as count FROM test_attempts'),
    client.execute('SELECT COUNT(*) as count FROM submissions'),
  ]);

  const studentsCount = Number(stdCountRes.rows[0]?.count || 0);
  const attemptsCount = Number(attCountRes.rows[0]?.count || 0);
  const submissionsCount = Number(subCountRes.rows[0]?.count || 0);

  // Clean all student-related tables
  await client.execute('DELETE FROM student_presence');
  await client.execute('DELETE FROM attempt_questions');
  await client.execute('DELETE FROM submissions');
  await client.execute('DELETE FROM test_attempts');
  await client.execute('DELETE FROM activity_logs');
  await client.execute("DELETE FROM login_activity WHERE user_role = 'student' OR user_id LIKE 'std-%' OR user_id LIKE 'usr-%'");
  await client.execute('DELETE FROM students');

  return {
    success: true,
    deleted: {
      students: studentsCount,
      test_attempts: attemptsCount,
      submissions: submissionsCount,
    },
    message: `All student records wiped cleanly (${studentsCount} students, ${attemptsCount} attempts, ${submissionsCount} submissions).`,
  };
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
  session_version?: number;
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

  // 1. Verify student account state and session validity
  const validation = await validateStudentAccountAndSession(data.student_id, data.session_version);
  if (!validation.valid) {
    // If account was deleted/archived/disabled, immediately purge any presence row
    await client.execute({
      sql: 'DELETE FROM student_presence WHERE student_id = ?',
      args: [data.student_id],
    });
    const error: any = new Error(validation.message);
    error.statusCode = validation.code;
    throw error;
  }

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

  // Purge any orphan presence records for accounts that are deleted, archived, or disabled
  await client.execute(`
    DELETE FROM student_presence 
    WHERE student_id NOT IN (
      SELECT id FROM students 
      WHERE (account_deleted = 0 OR account_deleted IS NULL)
        AND (is_archived = 0 OR is_archived IS NULL)
        AND (is_active = 1 OR is_active IS NULL)
        AND (status = 'active' OR status IS NULL)
    )
  `).catch(() => {});

  // Only select presence records that belong to currently active, non-archived, non-deleted students
  const res = await client.execute(`
    SELECT sp.*, ta.ends_at, ta.start_time as attempt_start_time
    FROM student_presence sp
    INNER JOIN students s ON sp.student_id = s.id
    LEFT JOIN test_attempts ta ON sp.student_id = ta.student_id
      AND sp.active_assessment_id = ta.test_id
      AND (ta.status = 'in_progress' OR ta.status = 'not_started')
    WHERE (s.account_deleted = 0 OR s.account_deleted IS NULL)
      AND (s.is_archived = 0 OR s.is_archived IS NULL)
      AND (s.is_active = 1 OR s.is_active IS NULL)
      AND (s.status = 'active' OR s.status IS NULL)
    ORDER BY sp.last_seen DESC
  `);
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
      ends_at: row.ends_at ? String(row.ends_at) : null,
      attempt_start_time: row.attempt_start_time ? String(row.attempt_start_time) : null,
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
      assessment_code: row.code ? String(row.code) : '',
      instructions: row.instructions ? String(row.instructions) : '',
      duration: Number(row.duration || 60),
      duration_minutes: Number(row.duration || 60),
      duration_seconds: Number(row.duration || 60) * 60,
      total_marks: Number(row.total_marks || 100),
      passing_marks: Number(row.passing_marks || 40),
      start_time: row.start_time ? String(row.start_time) : '',
      start_at: row.start_time ? String(row.start_time) : '',
      end_time: row.end_time ? String(row.end_time) : '',
      end_at: row.end_time ? String(row.end_time) : '',
      status: String(row.status || 'draft'),
      year: Number(row.year || 2),
      question_count: Number(row.question_count || questionCount),
      is_archived: Number(row.is_archived || 0) === 1,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
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
    year: Number(q.year || testRow.year || 2),
    topic: String(q.topic || 'Algorithms'),
    initial_code: q.initial_code ? String(q.initial_code) : '',
    solution_code: q.solution_code ? String(q.solution_code) : '',
    test_cases: q.test_cases ? JSON.parse(String(q.test_cases)) : [],
    time_limit: Number(q.time_limit || 2000),
    memory_limit: Number(q.memory_limit || 128),
    input_format: String(q.input_format || ''),
    output_format: String(q.output_format || ''),
    constraints: String(q.constraints || ''),
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
    assessment_code: testRow.code ? String(testRow.code) : '',
    instructions: testRow.instructions ? String(testRow.instructions) : '',
    duration: Number(testRow.duration || 60),
    duration_minutes: Number(testRow.duration || 60),
    duration_seconds: Number(testRow.duration || 60) * 60,
    total_marks: Number(testRow.total_marks || 100),
    passing_marks: Number(testRow.passing_marks || 40),
    start_time: testRow.start_time ? String(testRow.start_time) : '',
    start_at: testRow.start_time ? String(testRow.start_time) : '',
    end_time: testRow.end_time ? String(testRow.end_time) : '',
    end_at: testRow.end_time ? String(testRow.end_time) : '',
    status: String(testRow.status || 'draft'),
    year: Number(testRow.year || 2),
    question_count: Number(testRow.question_count || questions.length),
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
  assessment_code?: string;
  instructions?: string;
  duration?: number;
  duration_minutes?: number;
  duration_seconds?: number;
  total_marks?: number;
  passing_marks?: number;
  start_time?: string;
  start_at?: string;
  end_time?: string;
  end_at?: string;
  status?: string;
  year?: number;
  question_count?: number;
  questions?: Array<{
    title: string;
    description: string;
    difficulty?: string;
    marks?: number;
    initial_code?: string;
    starter_code?: string;
    solution_code?: string;
    test_cases?: any[];
    year?: number;
    topic?: string;
  }>;
}) {
  await initTursoDb();
  const client = getTursoClient();

  // 1. Title validation (required, trimmed, reject empty/whitespace)
  const title = (data.title || '').trim();
  if (!title) {
    const err: any = new Error('Assessment title is required.');
    err.status = 400;
    throw err;
  }

  // 2. Academic year validation (strictly 2 or 3)
  const testYear = Number(data.year !== undefined ? data.year : 2);
  if (testYear !== 2 && testYear !== 3) {
    const err: any = new Error('Academic year must be 2 (2nd Year) or 3 (3rd Year).');
    err.status = 400;
    throw err;
  }

  // 3. Assessment code normalization & uniqueness
  const rawCode = (data.code || data.assessment_code || '').trim();
  let code = rawCode.toUpperCase();
  if (!code) {
    code = `JIT-Y${testYear}-PY-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const dupRes = await client.execute({
    sql: 'SELECT id FROM tests WHERE UPPER(TRIM(code)) = ? LIMIT 1',
    args: [code],
  });
  if (dupRes.rows.length > 0) {
    const err: any = new Error(`Assessment code '${code}' already exists.`);
    err.status = 409;
    throw err;
  }

  // 4. Duration validation (> 0 minutes)
  const duration = Number(
    data.duration !== undefined
      ? data.duration
      : data.duration_minutes !== undefined
      ? data.duration_minutes
      : data.duration_seconds !== undefined
      ? Math.round(data.duration_seconds / 60)
      : 60
  );
  if (isNaN(duration) || duration <= 0) {
    const err: any = new Error('Duration must be greater than 0 minutes.');
    err.status = 400;
    throw err;
  }

  // 5. Total marks validation (> 0)
  const totalMarks = Number(data.total_marks !== undefined ? data.total_marks : 100);
  if (isNaN(totalMarks) || totalMarks <= 0) {
    const err: any = new Error('Total marks must be greater than 0.');
    err.status = 400;
    throw err;
  }

  // 6. Passing marks validation (0 <= passing_marks <= total_marks)
  const passingMarks = Number(data.passing_marks !== undefined ? data.passing_marks : 40);
  if (isNaN(passingMarks) || passingMarks < 0) {
    const err: any = new Error('Passing marks cannot be negative.');
    err.status = 400;
    throw err;
  }
  if (passingMarks > totalMarks) {
    const err: any = new Error('Passing marks cannot exceed total marks.');
    err.status = 400;
    throw err;
  }

  // 7. Start / End window validation
  const startTime = data.start_time || data.start_at || null;
  const endTime = data.end_time || data.end_at || null;
  if (startTime && endTime) {
    const sMs = new Date(startTime).getTime();
    const eMs = new Date(endTime).getTime();
    if (!isNaN(sMs) && !isNaN(eMs) && sMs >= eMs) {
      const err: any = new Error('End time must be after start time.');
      err.status = 400;
      throw err;
    }
  }

  // 8. Available Question Pool & Count Validation
  const pool = await getQuestionsFromDb({ year: testYear });
  const attachedCount = Array.isArray(data.questions) ? data.questions.length : 0;
  const availablePoolCount = Math.max(pool.length, attachedCount);
  let qCount = Number(data.question_count || 0);

  if (qCount > availablePoolCount) {
    const err: any = new Error(
      `Only ${availablePoolCount} questions are available in the Year ${testYear} question bank.`
    );
    err.status = 400;
    throw err;
  }
  if (qCount <= 0) {
    qCount = availablePoolCount; // Automatically allocate full pool
  }

  const testId = data.id || `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO tests (id, title, description, code, instructions, duration, total_marks, passing_marks, start_time, end_time, status, year, question_count, is_archived, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    args: [
      testId,
      title,
      data.description ? data.description.trim() : '',
      code,
      data.instructions || 'Ensure fullscreen remains active. Avoid switching tabs.',
      duration,
      totalMarks,
      passingMarks,
      startTime,
      endTime,
      data.status || 'draft',
      testYear,
      qCount,
      now,
      now,
    ],
  });

  if (data.questions && data.questions.length > 0) {
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      const qId = `q-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      await client.execute({
        sql: `INSERT INTO questions (id, test_id, title, description, difficulty, marks, initial_code, solution_code, test_cases, order_index, year, topic, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          qId,
          testId,
          q.title.trim(),
          q.description || '',
          q.difficulty || 'medium',
          q.marks || 20,
          q.starter_code || q.initial_code || '',
          q.solution_code || '',
          JSON.stringify(q.test_cases || []),
          i,
          q.year ? Number(q.year) : testYear,
          q.topic || 'Algorithms',
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
    assessment_code?: string;
    instructions?: string;
    duration?: number;
    duration_minutes?: number;
    duration_seconds?: number;
    total_marks?: number;
    passing_marks?: number;
    start_time?: string;
    start_at?: string;
    end_time?: string;
    end_at?: string;
    status?: string;
    year?: number;
    question_count?: number;
    questions?: Array<{
      id?: string;
      title: string;
      description: string;
      difficulty?: string;
      marks?: number;
      initial_code?: string;
      solution_code?: string;
      test_cases?: any[];
      year?: number;
      topic?: string;
    }>;
  }
) {
  await initTursoDb();
  const client = getTursoClient();
  const now = new Date().toISOString();

  // Load existing assessment
  const existing = await getAssessmentWithQuestions(id);
  if (!existing) {
    const err: any = new Error('Assessment not found');
    err.status = 404;
    throw err;
  }

  const attemptsCount = Number(existing.participant_count || 0);
  const updates: string[] = ['updated_at = ?'];
  const args: any[] = [now];

  // 1. Title validation
  if (data.title !== undefined) {
    const trimmed = data.title.trim();
    if (!trimmed) {
      const err: any = new Error('Assessment title is required.');
      err.status = 400;
      throw err;
    }
    updates.push('title = ?');
    args.push(trimmed);
  }

  // 2. Code validation & uniqueness
  const codeCandidate = data.code !== undefined ? data.code : data.assessment_code;
  if (codeCandidate !== undefined) {
    const trimmedCode = codeCandidate.trim().toUpperCase();
    if (!trimmedCode) {
      const err: any = new Error('Assessment code cannot be empty.');
      err.status = 400;
      throw err;
    }
    const dupRes = await client.execute({
      sql: 'SELECT id FROM tests WHERE UPPER(TRIM(code)) = ? AND id != ? LIMIT 1',
      args: [trimmedCode, id],
    });
    if (dupRes.rows.length > 0) {
      const err: any = new Error(`Assessment code '${trimmedCode}' already exists.`);
      err.status = 409;
      throw err;
    }
    updates.push('code = ?');
    args.push(trimmedCode);
  }

  // 3. Year validation & protection
  const targetYear = data.year !== undefined ? Number(data.year) : existing.year;
  if (data.year !== undefined) {
    if (targetYear !== 2 && targetYear !== 3) {
      const err: any = new Error('Academic year must be 2 (2nd Year) or 3 (3rd Year).');
      err.status = 400;
      throw err;
    }
    if (attemptsCount > 0 && targetYear !== existing.year) {
      const err: any = new Error('Cannot change academic year because student attempts already exist for this assessment.');
      err.status = 400;
      throw err;
    }
    updates.push('year = ?');
    args.push(targetYear);
  }

  // 4. Duration validation
  const durationCandidate =
    data.duration !== undefined
      ? data.duration
      : data.duration_minutes !== undefined
      ? data.duration_minutes
      : data.duration_seconds !== undefined
      ? Math.round(data.duration_seconds / 60)
      : undefined;
  if (durationCandidate !== undefined) {
    const d = Number(durationCandidate);
    if (isNaN(d) || d <= 0) {
      const err: any = new Error('Duration must be greater than 0 minutes.');
      err.status = 400;
      throw err;
    }
    updates.push('duration = ?');
    args.push(d);
  }

  // 5. Marks validation
  const targetTotal = data.total_marks !== undefined ? Number(data.total_marks) : existing.total_marks;
  if (data.total_marks !== undefined) {
    if (isNaN(targetTotal) || targetTotal <= 0) {
      const err: any = new Error('Total marks must be greater than 0.');
      err.status = 400;
      throw err;
    }
    updates.push('total_marks = ?');
    args.push(targetTotal);
  }

  const targetPassing = data.passing_marks !== undefined ? Number(data.passing_marks) : existing.passing_marks;
  if (data.passing_marks !== undefined) {
    if (isNaN(targetPassing) || targetPassing < 0) {
      const err: any = new Error('Passing marks cannot be negative.');
      err.status = 400;
      throw err;
    }
    if (targetPassing > targetTotal) {
      const err: any = new Error('Passing marks cannot exceed total marks.');
      err.status = 400;
      throw err;
    }
    updates.push('passing_marks = ?');
    args.push(targetPassing);
  }

  // 6. Window validation
  const newStart =
    data.start_time !== undefined
      ? data.start_time
      : data.start_at !== undefined
      ? data.start_at
      : existing.start_time;
  const newEnd =
    data.end_time !== undefined
      ? data.end_time
      : data.end_at !== undefined
      ? data.end_at
      : existing.end_time;
  if (newStart && newEnd) {
    const sMs = new Date(newStart).getTime();
    const eMs = new Date(newEnd).getTime();
    if (!isNaN(sMs) && !isNaN(eMs) && sMs >= eMs) {
      const err: any = new Error('End time must be after start time.');
      err.status = 400;
      throw err;
    }
  }
  if (data.start_time !== undefined || data.start_at !== undefined) {
    updates.push('start_time = ?');
    args.push(data.start_time || data.start_at || null);
  }
  if (data.end_time !== undefined || data.end_at !== undefined) {
    updates.push('end_time = ?');
    args.push(data.end_time || data.end_at || null);
  }

  if (data.description !== undefined) {
    updates.push('description = ?');
    args.push(data.description ? data.description.trim() : '');
  }
  if (data.instructions !== undefined) {
    updates.push('instructions = ?');
    args.push(data.instructions);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    args.push(data.status);
  }

  // 7. Question pool validation
  const pool = await getQuestionsFromDb({ year: targetYear });
  const attachedCount = Array.isArray(data.questions) ? data.questions.length : (existing.questions?.length || 0);
  const availablePoolCount = Math.max(pool.length, attachedCount);

  if (data.question_count !== undefined) {
    const qc = Number(data.question_count);
    if (qc > availablePoolCount) {
      const err: any = new Error(
        `Only ${availablePoolCount} questions are available in the Year ${targetYear} question bank.`
      );
      err.status = 400;
      throw err;
    }
    updates.push('question_count = ?');
    args.push(qc <= 0 ? availablePoolCount : qc);
  }

  args.push(id);
  await client.execute({
    sql: `UPDATE tests SET ${updates.join(', ')} WHERE id = ?`,
    args,
  });

  // If questions are provided and no active attempts, replace questions
  if (data.questions && data.questions.length > 0) {
    if (attemptsCount > 0) {
      const err: any = new Error('Assessment questions cannot be modified because candidate attempts already exist.');
      err.status = 400;
      throw err;
    }
    await client.execute({
      sql: 'DELETE FROM questions WHERE test_id = ?',
      args: [id],
    });
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      const qId = q.id || `q-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      await client.execute({
        sql: `INSERT INTO questions (id, test_id, title, description, difficulty, marks, initial_code, solution_code, test_cases, order_index, year, topic, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          qId,
          id,
          q.title.trim(),
          q.description || '',
          q.difficulty || 'medium',
          q.marks || 20,
          q.initial_code || 'def solution():\n    pass\n',
          q.solution_code || '',
          JSON.stringify(q.test_cases || []),
          i,
          q.year ? Number(q.year) : targetYear,
          q.topic || 'Algorithms',
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
// QUESTION BANK REPOSITORY (STRICT YEAR-BASED POOLS)
// -------------------------------------------------------------
export async function getQuestionsFromDb(filters?: {
  year?: number;
  test_id?: string;
  topic?: string;
  difficulty?: string;
}) {
  await initTursoDb();
  const client = getTursoClient();

  let sql = 'SELECT * FROM questions WHERE (is_archived = 0 OR is_archived IS NULL)';
  const args: any[] = [];

  if (filters?.year) {
    sql += ' AND year = ?';
    args.push(Number(filters.year));
  }
  if (filters?.test_id) {
    sql += ' AND test_id = ?';
    args.push(filters.test_id);
  }
  if (filters?.topic && filters.topic !== 'all') {
    sql += ' AND topic = ?';
    args.push(filters.topic);
  }
  if (filters?.difficulty && filters.difficulty !== 'all') {
    sql += ' AND LOWER(difficulty) = LOWER(?)';
    args.push(filters.difficulty);
  }

  sql += ' ORDER BY created_at DESC';

  const res = await client.execute({ sql, args });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    test_id: String(row.test_id),
    title: String(row.title),
    slug: String(row.id),
    description: String(row.description),
    year: Number(row.year || 2),
    difficulty: String(row.difficulty),
    topic: String(row.topic || 'Algorithms'),
    marks: Number(row.marks || 20),
    initial_code: row.starter_code ? String(row.starter_code) : (row.initial_code ? String(row.initial_code) : ''),
    starter_code: row.starter_code ? String(row.starter_code) : (row.initial_code ? String(row.initial_code) : ''),
    solution_code: row.solution_code ? String(row.solution_code) : undefined,
    test_cases: row.test_cases ? JSON.parse(String(row.test_cases)) : [],
    time_limit: Number(row.time_limit || 2000),
    time_limit_ms: Number(row.time_limit || 2000),
    memory_limit: Number(row.memory_limit || 128),
    memory_limit_kb: Number(row.memory_limit || 128) * 1024,
    input_format: String(row.input_format || ''),
    output_format: String(row.output_format || ''),
    constraints: String(row.constraints || ''),
    order_index: Number(row.order_index || 0),
    is_active: true,
    created_at: String(row.created_at),
  }));
}

export async function getQuestionByIdFromDb(id: string) {
  await initTursoDb();
  const client = getTursoClient();
  const res = await client.execute({
    sql: 'SELECT * FROM questions WHERE id = ? LIMIT 1',
    args: [id],
  });
  if (res.rows.length === 0) return null;
  const row: any = res.rows[0];
  return {
    id: String(row.id),
    test_id: String(row.test_id),
    title: String(row.title),
    slug: String(row.id),
    description: String(row.description),
    year: Number(row.year || 2),
    difficulty: String(row.difficulty),
    topic: String(row.topic || 'Algorithms'),
    marks: Number(row.marks || 20),
    initial_code: row.starter_code ? String(row.starter_code) : (row.initial_code ? String(row.initial_code) : ''),
    starter_code: row.starter_code ? String(row.starter_code) : (row.initial_code ? String(row.initial_code) : ''),
    solution_code: row.solution_code ? String(row.solution_code) : undefined,
    test_cases: row.test_cases ? JSON.parse(String(row.test_cases)) : [],
    time_limit: Number(row.time_limit || 2000),
    time_limit_ms: Number(row.time_limit || 2000),
    memory_limit: Number(row.memory_limit || 128),
    memory_limit_kb: Number(row.memory_limit || 128) * 1024,
    input_format: String(row.input_format || ''),
    output_format: String(row.output_format || ''),
    constraints: String(row.constraints || ''),
    is_active: true,
    created_at: String(row.created_at),
  };
}

export async function createQuestionInDb(data: {
  id?: string;
  test_id?: string;
  title: string;
  description: string;
  year: number; // 2 or 3
  difficulty?: string;
  topic?: string;
  marks?: number;
  starter_code?: string;
  initial_code?: string;
  solution_code?: string;
  test_cases?: any[];
  time_limit?: number;
  memory_limit?: number;
  input_format?: string;
  output_format?: string;
  constraints?: string;
}) {
  await initTursoDb();
  const client = getTursoClient();
  const qId = data.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const qYear = Number(data.year) === 3 ? 3 : 2; // Strict 2 or 3

  if (!Array.isArray(data.test_cases) || data.test_cases.length !== 3) {
    const err: any = new Error('Every coding question must have exactly 3 test cases.');
    err.status = 400;
    throw err;
  }

  const starterCode = data.starter_code !== undefined ? data.starter_code : (data.initial_code || '');

  await client.execute({
    sql: `INSERT INTO questions (id, test_id, title, description, difficulty, marks, initial_code, starter_code, solution_code, test_cases, time_limit, memory_limit, order_index, year, topic, input_format, output_format, constraints, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
    args: [
      qId,
      data.test_id || 'bank',
      data.title.trim(),
      data.description || '',
      data.difficulty || 'Easy',
      data.marks || 20,
      starterCode,
      starterCode,
      data.solution_code || '',
      JSON.stringify(data.test_cases),
      data.time_limit || 2000,
      data.memory_limit || 128,
      qYear,
      data.topic || 'Algorithms',
      data.input_format || '',
      data.output_format || '',
      data.constraints || '',
      now,
    ],
  });

  return getQuestionByIdFromDb(qId);
}

export async function updateQuestionInDb(
  id: string,
  data: {
    title?: string;
    description?: string;
    year?: number;
    difficulty?: string;
    topic?: string;
    marks?: number;
    starter_code?: string;
    initial_code?: string;
    solution_code?: string;
    test_cases?: any[];
    time_limit?: number;
    memory_limit?: number;
    input_format?: string;
    output_format?: string;
    constraints?: string;
  }
) {
  await initTursoDb();
  const client = getTursoClient();

  if (data.test_cases !== undefined) {
    if (!Array.isArray(data.test_cases) || data.test_cases.length !== 3) {
      const err: any = new Error('Every coding question must have exactly 3 test cases.');
      err.status = 400;
      throw err;
    }
  }

  const updates: string[] = [];
  const args: any[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    args.push(data.title.trim());
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    args.push(data.description);
  }
  if (data.year !== undefined) {
    updates.push('year = ?');
    args.push(Number(data.year) === 3 ? 3 : 2);
  }
  if (data.difficulty !== undefined) {
    updates.push('difficulty = ?');
    args.push(data.difficulty);
  }
  if (data.topic !== undefined) {
    updates.push('topic = ?');
    args.push(data.topic);
  }
  if (data.marks !== undefined) {
    updates.push('marks = ?');
    args.push(Number(data.marks));
  }
  if (data.starter_code !== undefined) {
    updates.push('starter_code = ?');
    args.push(data.starter_code);
    updates.push('initial_code = ?');
    args.push(data.starter_code);
  } else if (data.initial_code !== undefined) {
    updates.push('starter_code = ?');
    args.push(data.initial_code);
    updates.push('initial_code = ?');
    args.push(data.initial_code);
  }
  if (data.solution_code !== undefined) {
    updates.push('solution_code = ?');
    args.push(data.solution_code);
  }
  if (data.test_cases !== undefined) {
    updates.push('test_cases = ?');
    args.push(JSON.stringify(data.test_cases));
  }
  if (data.time_limit !== undefined) {
    updates.push('time_limit = ?');
    args.push(Number(data.time_limit));
  }
  if (data.memory_limit !== undefined) {
    updates.push('memory_limit = ?');
    args.push(Number(data.memory_limit));
  }
  if (data.input_format !== undefined) {
    updates.push('input_format = ?');
    args.push(data.input_format);
  }
  if (data.output_format !== undefined) {
    updates.push('output_format = ?');
    args.push(data.output_format);
  }
  if (data.constraints !== undefined) {
    updates.push('constraints = ?');
    args.push(data.constraints);
  }

  if (updates.length > 0) {
    args.push(id);
    await client.execute({
      sql: `UPDATE questions SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });
  }

  return getQuestionByIdFromDb(id);
}

export async function deleteQuestionInDb(id: string) {
  await initTursoDb();
  const client = getTursoClient();

  // Check if question is referenced in attempts, submissions, or code executions
  const [attQRes, subRes] = await Promise.all([
    client.execute({
      sql: 'SELECT COUNT(*) as count FROM attempt_questions WHERE question_id = ?',
      args: [id],
    }),
    client.execute({
      sql: 'SELECT COUNT(*) as count FROM submissions WHERE question_id = ?',
      args: [id],
    }),
  ]);

  const usedInHistory = Number(attQRes.rows[0]?.count || 0) + Number(subRes.rows[0]?.count || 0);

  if (usedInHistory > 0) {
    // If used in student attempts/submissions, archive/deactivate preserving historical attempts
    await client.execute({
      sql: 'UPDATE questions SET is_archived = 1, is_active = 0 WHERE id = ?',
      args: [id],
    });
    return {
      success: true,
      archived: true,
      message: 'Question has historical student attempt records. It has been safely archived and deactivated.',
    };
  } else {
    // If unused, permanently delete
    await client.execute({
      sql: 'DELETE FROM questions WHERE id = ?',
      args: [id],
    });
    return {
      success: true,
      deleted: true,
      message: 'Question permanently deleted.',
    };
  }
}

export async function getQuestionPoolStats() {
  await initTursoDb();
  const client = getTursoClient();
  const [y2Res, y3Res, totalRes] = await Promise.all([
    client.execute('SELECT COUNT(*) as count FROM questions WHERE year = 2 AND (is_archived = 0 OR is_archived IS NULL)'),
    client.execute('SELECT COUNT(*) as count FROM questions WHERE year = 3 AND (is_archived = 0 OR is_archived IS NULL)'),
    client.execute('SELECT COUNT(*) as count FROM questions WHERE (is_archived = 0 OR is_archived IS NULL)'),
  ]);

  return {
    year2Count: Number(y2Res.rows[0]?.count || 0),
    year3Count: Number(y3Res.rows[0]?.count || 0),
    totalCount: Number(totalRes.rows[0]?.count || 0),
  };
}

// -------------------------------------------------------------
// YEAR-BASED RANDOMIZED ASSESSMENT ENGINE (FROZEN ATTEMPTS)
// -------------------------------------------------------------
export async function startOrGetAssessmentAttempt(testId: string, studentId: string, sessionVersion?: number) {
  await initTursoDb();
  const client = getTursoClient();

  // 1. Authenticate & load student from Turso DB
  const validation = await validateStudentAccountAndSession(studentId, sessionVersion);
  if (!validation.valid) {
    const err: any = new Error(validation.message);
    err.status = validation.code;
    throw err;
  }
  const student: any = validation.student;
  const studentYear = Number(student.year);

  // 2. Load assessment from Turso DB
  const tRes = await client.execute({
    sql: 'SELECT * FROM tests WHERE id = ? AND is_archived = 0 LIMIT 1',
    args: [testId],
  });
  if (tRes.rows.length === 0) {
    const err: any = new Error('Assessment not found or has been archived.');
    err.status = 404;
    throw err;
  }
  const test: any = tRes.rows[0];
  const testYear = Number(test.year || 2);

  // 3. Status Guard: Must be live/active/published
  const testStatus = String(test.status || 'draft').toLowerCase();
  if (testStatus !== 'live' && testStatus !== 'active' && testStatus !== 'published') {
    const err: any = new Error('This assessment is not currently active.');
    err.status = 403;
    throw err;
  }

  // 4. Server-Authoritative Assessment Window Guard
  const nowMs = Date.now();
  if (test.start_time && nowMs < new Date(test.start_time).getTime()) {
    const err: any = new Error('Assessment window has not started.');
    err.status = 403;
    throw err;
  }
  if (test.end_time && nowMs > new Date(test.end_time).getTime()) {
    const err: any = new Error('Assessment window has closed.');
    err.status = 403;
    throw err;
  }

  // 5. Strict Server-Side Academic Year Guard
  if (studentYear !== testYear) {
    const err: any = new Error('This assessment is not available for your academic year.');
    err.status = 403;
    throw err;
  }

  // 6. Check for active attempt in progress
  const attRes = await client.execute({
    sql: "SELECT * FROM test_attempts WHERE student_id = ? AND test_id = ? AND (status = 'in_progress' OR status = 'not_started') ORDER BY start_time DESC LIMIT 1",
    args: [studentId, testId],
  });

  if (attRes.rows.length > 0) {
    const existingAttempt: any = attRes.rows[0];
    const attemptId = String(existingAttempt.id);

    // Retrieve already frozen assigned questions from attempt_questions
    const aqRes = await client.execute({
      sql: `SELECT aq.id as aq_id, aq.question_order, q.*
            FROM attempt_questions aq
            JOIN questions q ON aq.question_id = q.id
            WHERE aq.attempt_id = ?
            ORDER BY aq.question_order ASC`,
      args: [attemptId],
    });

    if (aqRes.rows.length > 0) {
      // FROZEN SET: DO NOT RANDOMIZE AGAIN
      const assignedQuestions = aqRes.rows.map((row: any) => {
        const testCases = row.test_cases ? JSON.parse(String(row.test_cases)) : [];
        const sanitizedCases = testCases.map((tc: any) => ({
          id: tc.id,
          input: tc.is_hidden ? '' : tc.input,
          expected_output: tc.is_hidden ? '' : tc.expected_output,
          is_hidden: Boolean(tc.is_hidden),
          weight: tc.weight || 1,
          explanation: tc.explanation || '',
        }));

        return {
          id: String(row.id),
          test_id: String(row.test_id),
          title: String(row.title),
          slug: String(row.id),
          description: String(row.description),
          difficulty: String(row.difficulty),
          topic: String(row.topic || 'Algorithms'),
          marks: Number(row.marks || 20),
          year: Number(row.year),
          initial_code: row.starter_code ? String(row.starter_code) : (row.initial_code ? String(row.initial_code) : ''),
          starter_code: row.starter_code ? String(row.starter_code) : (row.initial_code ? String(row.initial_code) : ''),
          input_format: String(row.input_format || ''),
          output_format: String(row.output_format || ''),
          constraints: String(row.constraints || ''),
          time_limit_ms: Number(row.time_limit || 2000),
          memory_limit_kb: Number(row.memory_limit || 128000),
          order_index: Number(row.question_order || 0),
          test_cases: sanitizedCases,
        };
      });

      let answers: Record<string, any> = {};
      if (existingAttempt.answers) {
        try {
          answers = JSON.parse(String(existingAttempt.answers));
        } catch {}
      }

      return {
        isExisting: true,
        attempt: {
          id: attemptId,
          test_id: testId,
          student_id: studentId,
          start_time: String(existingAttempt.start_time),
          status: String(existingAttempt.status),
          score: Number(existingAttempt.score || 0),
          max_score: Number(existingAttempt.max_score || 100),
          answers,
        },
        test: {
          id: String(test.id),
          title: String(test.title),
          description: String(test.description || ''),
          duration_minutes: Number(test.duration || 60),
          total_marks: Number(test.total_marks || 100),
          year: testYear,
          question_count: assignedQuestions.length,
          instructions: String(test.instructions || ''),
        },
        questions: assignedQuestions,
      };
    }
  }

  // 7. Query eligible question pool strictly for student's year
  const poolRes = await client.execute({
    sql: `SELECT * FROM questions
          WHERE year = ? AND (test_id = ? OR test_id = 'bank' OR test_id = '' OR test_id IS NULL)
          ORDER BY created_at DESC`,
    args: [studentYear, testId],
  });

  const pool = poolRes.rows.map((row: any) => ({
    id: String(row.id),
    test_id: String(row.test_id),
    title: String(row.title),
    slug: String(row.id),
    description: String(row.description),
    difficulty: String(row.difficulty),
    topic: String(row.topic || 'Algorithms'),
    marks: Number(row.marks || 20),
    year: Number(row.year),
    initial_code: row.starter_code ? String(row.starter_code) : (row.initial_code ? String(row.initial_code) : ''),
    starter_code: row.starter_code ? String(row.starter_code) : (row.initial_code ? String(row.initial_code) : ''),
    input_format: String(row.input_format || ''),
    output_format: String(row.output_format || ''),
    constraints: String(row.constraints || ''),
    time_limit_ms: Number(row.time_limit || 2000),
    memory_limit_kb: Number(row.memory_limit || 128000),
    test_cases: row.test_cases ? JSON.parse(String(row.test_cases)) : [],
  }));

  // Determine configured number of questions
  const configuredCount = Number(test.question_count || 0);
  const requiredCount = configuredCount > 0 ? configuredCount : pool.length;

  // Edge case check:
  if (pool.length < requiredCount || pool.length === 0) {
    const yearLabel = studentYear === 2 ? '2nd Year' : studentYear === 3 ? '3rd Year' : `Year ${studentYear}`;
    const err: any = new Error(
      `Insufficient questions for this assessment. Required: ${requiredCount}. Available for ${yearLabel}: ${pool.length}.`
    );
    err.status = 400;
    throw err;
  }

  // 8. Cryptographically secure server-side randomization (Fisher-Yates)
  // Ensure every question selected has question.year === studentYear
  const eligiblePool = pool.filter((q) => q.year === studentYear);
  for (let i = eligiblePool.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [eligiblePool[i], eligiblePool[j]] = [eligiblePool[j], eligiblePool[i]];
  }

  // Select the configured number of questions
  const selectedQuestions = eligiblePool.slice(0, requiredCount);

  // Shuffle the selected array again to randomize display order
  for (let i = selectedQuestions.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]];
  }

  // 9. Create attempt in test_attempts (atomic with double-click race condition protection)
  const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const randomSeed = crypto.randomBytes(8).toString('hex');
  const durationMinutes = Number(test.duration || 60);
  const startTimeDate = new Date();
  const endsAtDate = new Date(startTimeDate.getTime() + durationMinutes * 60 * 1000);
  const now = startTimeDate.toISOString();
  const endsAt = endsAtDate.toISOString();

  try {
    await client.execute({
      sql: `INSERT INTO test_attempts (id, test_id, student_id, start_time, ends_at, score, max_score, status, question_seed, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, 'in_progress', ?, ?)`,
      args: [
        attemptId,
        testId,
        studentId,
        now,
        endsAt,
        Number(test.total_marks || 100),
        randomSeed,
        now,
      ],
    });
  } catch (insertErr: any) {
    // If a concurrent request created an attempt at the exact same millisecond, return the existing attempt
    const concurrentCheck = await client.execute({
      sql: "SELECT * FROM test_attempts WHERE student_id = ? AND test_id = ? AND (status = 'in_progress' OR status = 'not_started') ORDER BY start_time DESC LIMIT 1",
      args: [studentId, testId],
    });
    if (concurrentCheck.rows.length > 0) {
      return await startOrGetAssessmentAttempt(testId, studentId, sessionVersion);
    }
    throw insertErr;
  }

  // 8. Freeze assigned questions in attempt_questions table
  for (let idx = 0; idx < selectedQuestions.length; idx++) {
    const q = selectedQuestions[idx];
    const aqId = `aq-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
    await client.execute({
      sql: `INSERT INTO attempt_questions (id, attempt_id, question_id, question_order, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [aqId, attemptId, q.id, idx + 1, now],
    });
  }

  // 9. Update presence table with active assessment
  await client.execute({
    sql: `UPDATE student_presence
          SET active_assessment_id = ?, session_status = 'IN_ASSESSMENT', current_question_index = 0, total_questions = ?
          WHERE student_id = ?`,
    args: [testId, selectedQuestions.length, studentId],
  });

  // 10. Record activity log
  await recordActivityLogInDb({
    test_id: testId,
    student_id: studentId,
    student_name: student.full_name,
    register_number: student.register_number,
    event_type: 'TEST_STARTED',
    description: `Candidate started ${test.title} (${testYear === 2 ? '2nd Year' : '3rd Year'}). Assigned ${selectedQuestions.length} randomized questions.`,
    metadata: {
      attemptId,
      studentYear,
      testYear,
      assignedQuestionIds: selectedQuestions.map((q) => q.id),
    },
  });

  // 11. Sanitize test cases before returning to frontend
  const sanitizedQuestions = selectedQuestions.map((q, idx) => ({
    ...q,
    order_index: idx + 1,
    test_cases: (q.test_cases || []).map((tc: any) => ({
      id: tc.id,
      input: tc.is_hidden ? '' : tc.input,
      expected_output: tc.is_hidden ? '' : tc.expected_output,
      is_hidden: Boolean(tc.is_hidden),
      weight: tc.weight || 1,
      explanation: tc.explanation || '',
    })),
  }));

  return {
    isExisting: false,
    attempt: {
      id: attemptId,
      test_id: testId,
      student_id: studentId,
      start_time: now,
      status: 'in_progress',
      score: 0,
      max_score: Number(test.total_marks || 100),
      answers: {},
    },
    test: {
      id: String(test.id),
      title: String(test.title),
      description: String(test.description || ''),
      duration_minutes: Number(test.duration || 60),
      total_marks: Number(test.total_marks || 100),
      year: testYear,
      question_count: selectedQuestions.length,
      instructions: String(test.instructions || ''),
    },
    questions: sanitizedQuestions,
  };
}

export async function verifyQuestionForStudentAttempt(
  studentId: string,
  questionId: string,
  attemptId?: string,
  sessionVersion?: number
): Promise<{ valid: boolean; error?: string; code?: number }> {
  await initTursoDb();
  const client = getTursoClient();

  // 1. Validate student account and session state
  const validation = await validateStudentAccountAndSession(studentId, sessionVersion);
  if (!validation.valid) {
    return { valid: false, error: validation.message, code: validation.code };
  }
  const student: any = validation.student;
  const studentYear = Number(student.year);

  // 2. Fetch question
  const qRes = await client.execute({
    sql: 'SELECT id, year FROM questions WHERE id = ? LIMIT 1',
    args: [questionId],
  });
  if (qRes.rows.length === 0) {
    return { valid: false, error: 'Question not found.' };
  }
  const questionYear = Number(qRes.rows[0].year);

  // Academic year must match!
  if (questionYear !== studentYear) {
    return {
      valid: false,
      error: `Question does not belong to your academic year (${studentYear === 2 ? '2nd' : '3rd'} Year).`,
      code: 403,
    };
  }

  // 3. If attemptId provided, verify attempt ownership, timer deadline, and assigned questions
  if (attemptId && attemptId !== 'general') {
    const aRes = await client.execute({
      sql: 'SELECT ta.*, t.duration FROM test_attempts ta LEFT JOIN tests t ON ta.test_id = t.id WHERE ta.id = ? LIMIT 1',
      args: [attemptId],
    });

    if (aRes.rows.length > 0) {
      const att: any = aRes.rows[0];

      // Ownership guard
      if (att.student_id && att.student_id !== studentId) {
        return {
          valid: false,
          error: 'Unauthorized attempt access. Attempt belongs to another candidate.',
          code: 403,
        };
      }

      // Status guard
      if (att.status === 'completed' || att.status === 'submitted' || att.status === 'auto_submitted') {
        return {
          valid: false,
          error: 'Assessment attempt has already concluded.',
          code: 403,
        };
      }

      // Server-authoritative timer deadline check (with 15s network latency buffer)
      const durationMin = Number(att.duration || 60);
      const endsAtMs = att.ends_at
        ? new Date(att.ends_at).getTime()
        : new Date(att.start_time).getTime() + durationMin * 60 * 1000;

      if (Date.now() > endsAtMs + 15000) {
        // Auto-finalize expired attempt in Turso
        try {
          await client.execute({
            sql: "UPDATE test_attempts SET status = 'auto_submitted', end_time = ? WHERE id = ?",
            args: [new Date().toISOString(), attemptId],
          });
        } catch {}

        return {
          valid: false,
          error: 'Assessment deadline has expired. Your attempt has been automatically finalized.',
          code: 403,
        };
      }
    }

    const countRes = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM attempt_questions WHERE attempt_id = ?',
      args: [attemptId],
    });
    const hasAssignedQuestions = Number(countRes.rows[0]?.count || 0) > 0;
    if (hasAssignedQuestions) {
      const aqRes = await client.execute({
        sql: 'SELECT id FROM attempt_questions WHERE attempt_id = ? AND question_id = ? LIMIT 1',
        args: [attemptId, questionId],
      });
      if (aqRes.rows.length === 0) {
        return {
          valid: false,
          error: 'Question is not assigned to this assessment attempt.',
          code: 403,
        };
      }
    }
  }

  return { valid: true };
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
    client.execute("SELECT COUNT(*) as count FROM students WHERE (account_deleted = 0 OR account_deleted IS NULL) AND (is_archived = 0 OR is_archived IS NULL) AND (status != 'archived' OR status IS NULL)"),
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

// -------------------------------------------------------------
// DASHBOARD DRILL-DOWN QUERIES (ACTUAL DB RECORDS)
// -------------------------------------------------------------
export async function getDashboardDrilldownFromDb(category: string) {
  await initTursoDb();
  const client = getTursoClient();

  switch (category) {
    case 'students':
    case 'totalStudents': {
      // TOTAL STUDENTS: Show actual student records from Turso
      const res = await client.execute(`
        SELECT s.id, s.full_name, s.register_number, s.email, s.department, s.year, s.section,
               s.status, s.created_at,
               (SELECT COUNT(*) FROM test_attempts WHERE student_id = s.id) as attempts_count,
               (SELECT MAX(created_at) FROM test_attempts WHERE student_id = s.id) as last_attempt_at
        FROM students s
        WHERE (s.account_deleted = 0 OR s.account_deleted IS NULL)
          AND (s.is_archived = 0 OR s.is_archived IS NULL)
          AND (s.status != 'archived' OR s.status IS NULL)
        ORDER BY s.full_name ASC
      `);
      return res.rows.map((r: any) => ({
        id: String(r.id),
        name: String(r.full_name || 'Candidate'),
        student_name: String(r.full_name || 'Candidate'),
        register_number: String(r.register_number),
        email: String(r.email || ''),
        department: String(r.department || 'CSE'),
        year: Number(r.year || 2),
        section: String(r.section || 'A'),
        status: String(r.status || 'active'),
        attempts_count: Number(r.attempts_count || 0),
        created_at: String(r.created_at || ''),
        last_attempt_at: r.last_attempt_at ? String(r.last_attempt_at) : null,
      }));
    }

    case 'online':
    case 'onlineCount': {
      // ONLINE NOW: Show students whose latest heartbeat indicates they are online
      const presenceList = await getPresenceListFromDb();
      return presenceList
        .filter((p) => p.session_status === 'ONLINE' || p.session_status === 'IN_ASSESSMENT' || p.session_status === 'WARNING')
        .map((p) => ({
          student_id: p.student_id,
          id: p.student_id,
          name: p.full_name || 'Candidate',
          student_name: p.full_name || 'Candidate',
          register_number: p.register_number,
          department: p.department,
          year: p.year,
          session_status: p.session_status,
          assessment_title: p.active_assessment_id ? 'Active Examination' : 'Active on Portal',
          current_question: `Question ${(p.current_question_index || 0) + 1}`,
          violation_count: p.violation_count || 0,
          tab_switch_count: (p as any).tab_switch_count || 0,
          fullscreen_exit_count: (p as any).fullscreen_exit_count || 0,
          last_seen: p.last_seen,
          last_seen_formatted: new Date(p.last_seen).toLocaleTimeString(),
        }));
    }

    case 'in_assessment':
    case 'inAssessmentCount': {
      // IN ASSESSMENT: Show students with currently active assessment attempts
      const res = await client.execute(`
        SELECT ta.id as attempt_id, ta.test_id, ta.student_id, ta.start_time, ta.status,
               ta.tab_switches, ta.fullscreen_exits, ta.violation_count,
               s.full_name as student_name, s.register_number, s.department, s.year,
               t.title as test_title, t.code as test_code, t.duration as test_duration,
               sp.current_question_index, sp.last_seen
        FROM test_attempts ta
        INNER JOIN students s ON ta.student_id = s.id
        LEFT JOIN tests t ON ta.test_id = t.id
        LEFT JOIN student_presence sp ON ta.student_id = sp.student_id
        WHERE ta.status = 'in_progress' OR ta.status = 'not_started'
        ORDER BY ta.start_time DESC
      `);
      return res.rows.map((r: any) => ({
        id: String(r.student_id),
        attempt_id: String(r.attempt_id),
        test_id: String(r.test_id),
        student_id: String(r.student_id),
        name: String(r.student_name || 'Candidate'),
        student_name: String(r.student_name || 'Candidate'),
        register_number: String(r.register_number),
        department: String(r.department || 'CSE'),
        year: Number(r.year || 2),
        assessment_title: String(r.test_title || 'Examination'),
        test_code: r.test_code ? String(r.test_code) : '',
        duration: Number(r.test_duration || 60),
        status: String(r.status),
        start_time: String(r.start_time),
        tab_switches: Number(r.tab_switches || 0),
        fullscreen_exits: Number(r.fullscreen_exits || 0),
        violation_count: Number(r.violation_count || 0),
        current_question: (r.current_question_index !== null && r.current_question_index !== undefined)
          ? `Question ${Number(r.current_question_index) + 1}`
          : 'Active In Exam',
      }));
    }

    case 'completed':
    case 'completedAttempts': {
      // COMPLETED: Show students/attempts that have actually completed assessments
      const res = await client.execute(`
        SELECT ta.id as attempt_id, ta.test_id, ta.student_id, ta.start_time, ta.end_time,
               ta.score, ta.max_score, ta.percentage, ta.status,
               ta.tab_switches, ta.fullscreen_exits, ta.time_taken_seconds, ta.completion_rank,
               s.full_name as student_name, s.register_number, s.department, s.year,
               t.title as test_title, t.code as test_code, t.passing_marks
        FROM test_attempts ta
        INNER JOIN students s ON ta.student_id = s.id
        LEFT JOIN tests t ON ta.test_id = t.id
        WHERE ta.status IN ('completed', 'submitted', 'auto_submitted')
        ORDER BY ta.end_time DESC
      `);
      return res.rows.map((r: any) => ({
        id: String(r.student_id),
        attempt_id: String(r.attempt_id),
        test_id: String(r.test_id),
        student_id: String(r.student_id),
        name: String(r.student_name || 'Candidate'),
        student_name: String(r.student_name || 'Candidate'),
        register_number: String(r.register_number),
        department: String(r.department || 'CSE'),
        year: Number(r.year || 2),
        assessment_title: String(r.test_title || 'Examination'),
        test_code: r.test_code ? String(r.test_code) : '',
        score: Number(r.score || 0),
        max_score: Number(r.max_score || 100),
        percentage: Number(r.percentage || (r.max_score ? Math.round((Number(r.score || 0) / Number(r.max_score)) * 100) : 0)),
        status: String(r.status),
        completed_at: String(r.end_time || ''),
        time_taken_seconds: Number(r.time_taken_seconds || 0),
        completion_rank: Number(r.completion_rank || 1),
        tab_switches: Number(r.tab_switches || 0),
        fullscreen_exits: Number(r.fullscreen_exits || 0),
      }));
    }

    case 'violations':
    case 'totalViolations': {
      // VIOLATIONS: Show the actual security/proctoring violations recorded in database
      // Fields: Student Name, Roll Number, Department, Year, Assessment, Violation Type, Timestamp, Question, Warning count, Total events
      const res = await client.execute(`
        SELECT al.id as log_id, al.student_id, al.student_name, al.register_number,
               al.test_id, al.event_type, al.description, al.metadata, al.timestamp,
               s.department, s.year, s.full_name as db_student_name,
               t.title as test_title,
               sp.violation_count as current_warning_count,
               (
                 SELECT COUNT(*) FROM activity_logs sub 
                 WHERE (sub.student_id = al.student_id OR sub.register_number = al.register_number)
                   AND (
                     sub.event_type IN ('TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY', 'PASTE', 'CUT', 'WINDOW_BLUR', 'WARNING_TRIGGERED', 'DEVTOOLS_OPEN', 'RIGHT_CLICK')
                     OR sub.event_type LIKE '%VIOLATION%'
                     OR sub.event_type LIKE '%TAB%'
                     OR sub.event_type LIKE '%FULLSCREEN%'
                   )
               ) as student_total_events
        FROM activity_logs al
        LEFT JOIN students s ON (al.student_id = s.id OR al.register_number = s.register_number)
        LEFT JOIN tests t ON al.test_id = t.id
        LEFT JOIN student_presence sp ON (al.student_id = sp.student_id OR al.register_number = sp.register_number)
        WHERE al.event_type IN ('TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY', 'PASTE', 'CUT', 'WINDOW_BLUR', 'WARNING_TRIGGERED', 'DEVTOOLS_OPEN', 'RIGHT_CLICK')
           OR al.event_type LIKE '%VIOLATION%'
           OR al.event_type LIKE '%TAB%'
           OR al.event_type LIKE '%FULLSCREEN%'
        ORDER BY al.timestamp DESC
        LIMIT 200
      `);

      return res.rows.map((r: any) => {
        let meta: any = {};
        try {
          meta = r.metadata ? JSON.parse(String(r.metadata)) : {};
        } catch {}

        const questionName = meta.question_title || meta.question || meta.currentQuestion || 'Assessment Question';
        const d = new Date(r.timestamp);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        const formattedTime = `${hours}:${minutes}:${seconds}`;

        const warningCount = Math.min(3, Math.max(1, Number(r.current_warning_count || meta.warningCount || meta.warning_count || 1)));

        return {
          id: String(r.student_id),
          log_id: String(r.log_id),
          student_id: String(r.student_id),
          name: String(r.db_student_name || r.student_name || 'Candidate'),
          student_name: String(r.db_student_name || r.student_name || 'Candidate'),
          register_number: String(r.register_number || ''),
          department: String(r.department || 'CSE'),
          year: Number(r.year || 2),
          assessment_title: String(r.test_title || 'Python Evaluation'),
          violation_type: String(r.event_type).toUpperCase(),
          timestamp: String(r.timestamp),
          created_at: String(r.timestamp),
          time_formatted: formattedTime,
          question: questionName,
          warning_count: warningCount,
          total_events: Number(r.student_total_events || 1),
          description: String(r.description || ''),
        };
      });
    }

    default:
      return [];
  }
}

// -------------------------------------------------------------
// CODE EXECUTIONS PERSISTENCE (JUDGE0 AUDIT TRAIL)
// -------------------------------------------------------------
export async function recordCodeExecutionInDb(data: {
  id?: string;
  student_id: string;
  attempt_id?: string;
  question_id?: string;
  source_code: string;
  language?: string;
  execution_status: string;
  test_cases_passed?: number;
  test_cases_failed?: number;
  execution_time?: number;
  memory_used?: number;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
}) {
  await initTursoDb();
  const client = getTursoClient();
  const execId = data.id || `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO code_executions (id, student_id, attempt_id, question_id, source_code, language, execution_status, test_cases_passed, test_cases_failed, execution_time, memory_used, stdout, stderr, compile_output, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      execId,
      data.student_id,
      data.attempt_id || null,
      data.question_id || null,
      data.source_code,
      data.language || 'python',
      data.execution_status,
      data.test_cases_passed || 0,
      data.test_cases_failed || 0,
      data.execution_time || 0,
      data.memory_used || 0,
      data.stdout || null,
      data.stderr || null,
      data.compile_output || null,
      now,
    ],
  });
}

// -------------------------------------------------------------
// AUTHORITATIVE ASSESSMENT ATTEMPT FINALIZATION & SCORING
// -------------------------------------------------------------
export async function finalizeAssessmentAttemptInDb(params: {
  attemptId: string;
  studentId: string;
  testId?: string;
  isAutoSubmit?: boolean;
}) {
  await initTursoDb();
  const client = getTursoClient();
  const { attemptId, studentId, isAutoSubmit = false } = params;

  // 1. Fetch attempt
  const aRes = await client.execute({
    sql: 'SELECT * FROM test_attempts WHERE id = ? LIMIT 1',
    args: [attemptId],
  });
  if (aRes.rows.length === 0) {
    throw new Error('Assessment attempt record not found.');
  }
  const attempt: any = aRes.rows[0];
  const targetTestId = attempt.test_id || params.testId;

  // 2. Fetch test
  const tRes = await client.execute({
    sql: 'SELECT * FROM tests WHERE id = ? LIMIT 1',
    args: [targetTestId],
  });
  const test: any = tRes.rows[0] || {};
  const totalMarks = Number(test.total_marks || 100);
  const passingMarks = Number(test.passing_marks !== undefined ? test.passing_marks : 40);

  // 3. Fetch assigned questions from frozen attempt_questions
  const aqRes = await client.execute({
    sql: `SELECT aq.question_id, aq.question_order, q.title, q.topic, q.difficulty, q.marks, q.test_cases
          FROM attempt_questions aq
          JOIN questions q ON aq.question_id = q.id
          WHERE aq.attempt_id = ?
          ORDER BY aq.question_order ASC`,
    args: [attemptId],
  });

  const assignedQuestions = aqRes.rows;

  // 4. Calculate score per assigned question from Turso submissions table (server-authoritative)
  let computedTotalScore = 0;
  const questionResults = [];

  for (const row of assignedQuestions) {
    const qId = String(row.question_id);
    const qMarks = Number(row.marks || 25);
    const qTitle = String(row.title || 'Question');
    const qTopic = String(row.topic || 'Algorithms');
    const qDiff = String(row.difficulty || 'Easy');
    const testCases = row.test_cases ? JSON.parse(String(row.test_cases)) : [];

    // Query highest score submission for this student + question + attempt
    const subRes = await client.execute({
      sql: `SELECT * FROM submissions 
            WHERE (attempt_id = ? OR student_id = ?) AND question_id = ?
            ORDER BY score DESC, created_at DESC LIMIT 1`,
      args: [attemptId, studentId, qId],
    });

    if (subRes.rows.length > 0) {
      const sub: any = subRes.rows[0];
      const earned = Math.min(qMarks, Number(sub.score || 0));
      computedTotalScore += earned;
      questionResults.push({
        question_id: qId,
        question_order: Number(row.question_order),
        title: qTitle,
        topic: qTopic,
        difficulty: qDiff,
        marks: qMarks,
        score: earned,
        status: String(sub.status || 'Submitted'),
        passed_test_cases: Number(sub.passed_test_cases || 0),
        total_test_cases: Number(sub.total_test_cases || testCases.length),
        is_passed: earned >= qMarks,
      });
    } else {
      questionResults.push({
        question_id: qId,
        question_order: Number(row.question_order),
        title: qTitle,
        topic: qTopic,
        difficulty: qDiff,
        marks: qMarks,
        score: 0,
        status: 'Unattempted',
        passed_test_cases: 0,
        total_test_cases: testCases.length,
        is_passed: false,
      });
    }
  }

  // 5. Server-side percentage and pass/fail
  const percentage = totalMarks > 0 ? Math.round((computedTotalScore / totalMarks) * 100) : 0;
  const isPassed = computedTotalScore >= passingMarks;

  // 6. Server-side time taken calculation
  const completedAt = new Date().toISOString();
  const startTimeMs = new Date(attempt.start_time).getTime();
  const completedTimeMs = new Date(completedAt).getTime();
  let timeTakenSeconds = Math.max(1, Math.round((completedTimeMs - startTimeMs) / 1000));
  if (attempt.ends_at) {
    const endsAtMs = new Date(attempt.ends_at).getTime();
    if (completedTimeMs > endsAtMs) {
      timeTakenSeconds = Math.max(1, Math.round((endsAtMs - startTimeMs) / 1000));
    }
  }

  // 7. Calculate completion rank among completed attempts for this test
  const rankRes = await client.execute({
    sql: `SELECT COUNT(*) as rank FROM test_attempts 
          WHERE test_id = ? 
            AND (status = 'completed' OR status = 'submitted' OR status = 'auto_submitted')
            AND id != ?`,
    args: [targetTestId, attemptId],
  });
  const completionRank = Number(rankRes.rows[0]?.rank || 0) + 1;

  // 8. Update test_attempts in Turso
  const finalStatus = isAutoSubmit ? 'auto_submitted' : 'completed';
  await client.execute({
    sql: `UPDATE test_attempts SET
            end_time = ?,
            score = ?,
            max_score = ?,
            percentage = ?,
            time_taken_seconds = ?,
            completion_rank = ?,
            status = ?,
            answers = ?,
            question_results = ?
          WHERE id = ?`,
    args: [
      completedAt,
      computedTotalScore,
      totalMarks,
      percentage,
      timeTakenSeconds,
      completionRank,
      finalStatus,
      JSON.stringify(questionResults),
      JSON.stringify(questionResults),
      attemptId,
    ],
  });

  // 9. Clear active assessment from presence
  await client.execute({
    sql: "UPDATE student_presence SET active_assessment_id = null, session_status = 'ONLINE' WHERE student_id = ?",
    args: [studentId],
  });

  // 10. Record activity log
  const studentRes = await client.execute({
    sql: 'SELECT full_name, register_number FROM students WHERE id = ? LIMIT 1',
    args: [studentId],
  });
  const student = studentRes.rows[0] as any;

  await recordActivityLogInDb({
    test_id: targetTestId,
    student_id: studentId,
    student_name: student?.full_name,
    register_number: student?.register_number,
    event_type: isAutoSubmit ? 'AUTO_SUBMISSION' : 'TEST_COMPLETED',
    description: `Assessment completed. Score: ${computedTotalScore}/${totalMarks} (${percentage}%). Rank: #${completionRank}`,
    metadata: {
      attemptId,
      score: computedTotalScore,
      totalMarks,
      percentage,
      completionRank,
      timeTakenSeconds,
      isAutoSubmit,
      isPassed,
    },
  });

  return {
    success: true,
    attemptId,
    score: computedTotalScore,
    totalMarks,
    percentage,
    passingMarks,
    isPassed,
    timeTakenSeconds,
    completionRank,
    status: finalStatus,
    completedAt,
    questionResults,
  };
}

// -------------------------------------------------------------
// STUDENT AUTHORITATIVE ASSESSMENT RESULT RETRIEVAL
// -------------------------------------------------------------
export async function getStudentAssessmentResultFromDb(testId: string, studentId: string) {
  await initTursoDb();
  const client = getTursoClient();

  // Find attempt for this student and test
  const attRes = await client.execute({
    sql: `SELECT ta.*, t.title as test_title, t.description as test_description, t.duration as test_duration,
                 t.total_marks as test_total_marks, t.passing_marks as test_passing_marks, t.year as test_year,
                 s.register_number, s.full_name, s.department, s.year as student_year
          FROM test_attempts ta
          JOIN tests t ON ta.test_id = t.id
          JOIN students s ON ta.student_id = s.id
          WHERE ta.student_id = ? AND ta.test_id = ?
          ORDER BY ta.created_at DESC LIMIT 1`,
    args: [studentId, testId],
  });

  if (attRes.rows.length === 0) {
    return null;
  }

  const att: any = attRes.rows[0];
  const isCompleted = att.status === 'completed' || att.status === 'submitted' || att.status === 'auto_submitted';

  const totalMarks = Number(att.test_total_marks || att.max_score || 100);
  const passingMarks = Number(att.test_passing_marks !== undefined ? att.test_passing_marks : 40);
  const score = Number(att.score || 0);
  const percentage = att.percentage !== undefined && att.percentage !== null
    ? Number(att.percentage)
    : totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  let timeTakenSeconds = Number(att.time_taken_seconds || 0);
  if (timeTakenSeconds <= 0 && att.start_time && att.end_time) {
    timeTakenSeconds = Math.max(1, Math.floor((new Date(att.end_time).getTime() - new Date(att.start_time).getTime()) / 1000));
  }

  let questions = [];
  if (att.question_results) {
    try {
      questions = JSON.parse(String(att.question_results));
    } catch {}
  }

  // If question_results was empty, query attempt_questions joined with questions
  if (questions.length === 0) {
    const aqRes = await client.execute({
      sql: `SELECT aq.question_order, q.id as question_id, q.title, q.topic, q.difficulty, q.marks
            FROM attempt_questions aq
            JOIN questions q ON aq.question_id = q.id
            WHERE aq.attempt_id = ?
            ORDER BY aq.question_order ASC`,
      args: [att.id],
    });
    questions = aqRes.rows.map((q: any) => ({
      question_id: String(q.question_id),
      question_order: Number(q.question_order),
      title: String(q.title),
      topic: String(q.topic || 'Algorithms'),
      difficulty: String(q.difficulty || 'Easy'),
      marks: Number(q.marks || 25),
      score: 0,
      status: 'Unattempted',
    }));
  }

  return {
    attempt_id: String(att.id),
    test_id: String(att.test_id),
    test_title: String(att.test_title),
    student_id: String(att.student_id),
    register_number: String(att.register_number),
    full_name: String(att.full_name),
    department: String(att.department),
    student_year: Number(att.student_year),
    score,
    total_marks: totalMarks,
    passing_marks: passingMarks,
    is_passed: score >= passingMarks,
    percentage,
    time_taken_seconds: timeTakenSeconds,
    status: String(att.status),
    is_completed: isCompleted,
    started_at: String(att.start_time),
    completed_at: att.end_time ? String(att.end_time) : null,
    completion_rank: Number(att.completion_rank || 1),
    tab_switch_count: Number(att.tab_switches || 0),
    fullscreen_exit_count: Number(att.fullscreen_exits || 0),
    copy_paste_count: Number(att.violation_count || 0),
    questions,
  };
}

// -------------------------------------------------------------
// OFFICIAL ROSTER REPLACEMENT & ARCHIVAL ENGINE
// -------------------------------------------------------------
export interface RosterStudent {
  name: string;
  roll_number: string;
  department?: string;
  year?: number;
  section?: string;
  email?: string;
  password?: string;
}

export async function replaceStudentsWithRoster(
  roster: RosterStudent[],
  adminInfo: { name: string; role: string } = { name: 'Administrator', role: 'admin' }
) {
  await initTursoDb();
  const client = getTursoClient();
  const now = new Date().toISOString();

  // 1. Normalize roster entries
  const normalizedRoster = roster.map((s) => {
    const roll = s.roll_number.trim().toUpperCase();
    const name = s.name.trim();
    const department = (s.department || 'CSE').trim().toUpperCase();
    const year = Number(s.year || 2);
    const section = (s.section || 'A').trim().toUpperCase();
    const email = (s.email || `${roll.toLowerCase()}@student.jit.edu`).trim().toLowerCase();
    const password = s.password ? s.password.trim() : roll;
    return {
      roll,
      name,
      department,
      year,
      section,
      email,
      password,
    };
  });

  const rosterRollSet = new Set(normalizedRoster.map((s) => s.roll));

  // 2. Fetch all current students in DB
  const existingRes = await client.execute('SELECT id, register_number, full_name, status FROM students');
  const existingStudents = existingRes.rows.map((r: any) => ({
    id: String(r.id),
    register_number: String(r.register_number).trim().toUpperCase(),
    full_name: String(r.full_name),
    status: String(r.status || 'active'),
  }));

  let archivedCount = 0;
  let deletedCount = 0;
  const archivedDetails: any[] = [];
  const deletedDetails: any[] = [];

  // 3. Deactivate/archive/delete students NOT in the roster
  for (const s of existingStudents) {
    if (!rosterRollSet.has(s.register_number)) {
      // Check if student has exam history
      const history = await checkStudentExamHistory(s.id);
      if (history.hasHistory) {
        // Safe Archive: Preserve academic records and results, revoke login credentials
        await client.execute({
          sql: `UPDATE students 
                SET is_active = 0, is_archived = 1, status = 'archived',
                    session_version = session_version + 1, updated_at = ?
                WHERE id = ?`,
          args: [now, s.id],
        });
        await client.execute({ sql: 'DELETE FROM student_presence WHERE student_id = ?', args: [s.id] });
        await recordActivityLogInDb({
          student_id: s.id,
          student_name: s.full_name,
          register_number: s.register_number,
          event_type: 'STUDENT_ARCHIVED',
          description: `${adminInfo.name} safely archived candidate ${s.register_number} (${s.full_name}) during official roster import. Academic history preserved.`,
          metadata: { attemptsCount: history.attemptsCount, submissionsCount: history.submissionsCount },
        });
        archivedCount++;
        archivedDetails.push({ id: s.id, roll: s.register_number, name: s.full_name, attempts: history.attemptsCount });
      } else {
        // 0 history: Safe to delete
        await client.execute({ sql: 'DELETE FROM student_presence WHERE student_id = ?', args: [s.id] });
        await client.execute({ sql: 'DELETE FROM login_activity WHERE user_id = ? OR UPPER(TRIM(register_number)) = ?', args: [s.id, s.register_number] });
        await client.execute({ sql: 'DELETE FROM activity_logs WHERE student_id = ?', args: [s.id] });
        await client.execute({ sql: 'DELETE FROM test_attempts WHERE student_id = ?', args: [s.id] });
        await client.execute({ sql: 'DELETE FROM students WHERE id = ?', args: [s.id] });
        await recordActivityLogInDb({
          student_id: s.id,
          student_name: s.full_name,
          register_number: s.register_number,
          event_type: 'STUDENT_DELETED',
          description: `${adminInfo.name} removed demo account ${s.register_number} (${s.full_name}) during official roster import.`,
          metadata: { zeroHistory: true },
        });
        deletedCount++;
        deletedDetails.push({ id: s.id, roll: s.register_number, name: s.full_name });
      }
    }
  }

  // 4. Pre-register / update all students from the official roster
  let insertedCount = 0;
  let updatedCount = 0;

  for (const s of normalizedRoster) {
    const passwordHash = hashPassword(s.password);
    const existing = await client.execute({
      sql: 'SELECT id FROM students WHERE UPPER(TRIM(register_number)) = ? LIMIT 1',
      args: [s.roll],
    });

    if (existing.rows.length > 0) {
      // Update existing student with official roster credentials
      const studentId = String(existing.rows[0].id);
      await client.execute({
        sql: `UPDATE students
              SET full_name = ?, email = ?, department = ?, year = ?, section = ?,
                  password_hash = ?, status = 'active', is_active = 1, is_archived = 0,
                  account_deleted = 0, updated_at = ?
              WHERE id = ?`,
        args: [s.name, s.email, s.department, s.year, s.section, passwordHash, now, studentId],
      });
      updatedCount++;
    } else {
      // Insert new student
      const studentId = `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await client.execute({
        sql: `INSERT INTO students (
                id, register_number, full_name, email, department, year, section,
                password_hash, status, is_active, is_archived, account_deleted,
                session_version, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, 0, 0, 1, ?, ?)`,
        args: [studentId, s.roll, s.name, s.email, s.department, s.year, s.section, passwordHash, now, now],
      });
      insertedCount++;
    }
  }

  // 5. Clean up student_presence of any non-active students
  await client.execute(`
    DELETE FROM student_presence 
    WHERE student_id NOT IN (
      SELECT id FROM students 
      WHERE (account_deleted = 0 OR account_deleted IS NULL)
        AND (is_archived = 0 OR is_archived IS NULL)
        AND status = 'active'
    )
  `).catch(() => {});

  // 6. Verification counts from DB
  const [activeRes, totalDbRes, qTotalRes, qY2Res, qY3Res, assessmentsRes] = await Promise.all([
    client.execute("SELECT COUNT(*) as count FROM students WHERE (account_deleted = 0 OR account_deleted IS NULL) AND (is_archived = 0 OR is_archived IS NULL) AND (status != 'archived' OR status IS NULL)"),
    client.execute("SELECT COUNT(*) as count FROM students"),
    client.execute("SELECT COUNT(*) as count FROM questions"),
    client.execute("SELECT COUNT(*) as count FROM questions WHERE year = 2"),
    client.execute("SELECT COUNT(*) as count FROM questions WHERE year = 3"),
    client.execute("SELECT COUNT(*) as count FROM tests WHERE is_archived = 0"),
  ]);

  const activeCount = Number(activeRes.rows[0]?.count || 0);
  const totalDbCount = Number(totalDbRes.rows[0]?.count || 0);
  const totalQuestions = Number(qTotalRes.rows[0]?.count || 0);
  const y2Questions = Number(qY2Res.rows[0]?.count || 0);
  const y3Questions = Number(qY3Res.rows[0]?.count || 0);
  const assessmentsCount = Number(assessmentsRes.rows[0]?.count || 0);

  return {
    success: true,
    roster_size: normalizedRoster.length,
    active_students: activeCount,
    total_students_in_db: totalDbCount,
    inserted: insertedCount,
    updated: updatedCount,
    archived: archivedCount,
    deleted: deletedCount,
    archived_details: archivedDetails,
    deleted_details: deletedDetails,
    questions_pool: {
      total: totalQuestions,
      year2: y2Questions,
      year3: y3Questions,
    },
    active_assessments: assessmentsCount,
  };
}

// -------------------------------------------------------------
// QUESTION TEST CASE & STARTER CODE CLEANUP / MIGRATION
// -------------------------------------------------------------
export async function migrateQuestionsToThreeTestCasesAndCleanStarterCode() {
  await initTursoDb();
  const client = getTursoClient();

  // 1. Move existing initial_code to solution_code if solution_code is empty
  await client.execute(`
    UPDATE questions 
    SET solution_code = initial_code 
    WHERE (solution_code IS NULL OR solution_code = '') 
      AND initial_code IS NOT NULL 
      AND initial_code != ''
  `);

  // 2. Clear initial_code and starter_code for questions so they default to empty
  await client.execute(`
    UPDATE questions 
    SET initial_code = '', starter_code = ''
  `);

  // 3. Migrate the 6 questions with != 3 test cases to have exactly 3 test cases
  const specificTestCases: Record<string, any[]> = {
    // 1. Two Sum in Python
    'q-1790330297341-0-o400': [
      { id: 'tc-1', input: '[2,7,11,15]\n9', expected_output: '[0, 1]', is_hidden: false, weight: 1 },
      { id: 'tc-2', input: '[3,2,4]\n6', expected_output: '[1, 2]', is_hidden: false, weight: 1 },
      { id: 'tc-3', input: '[3,3]\n6', expected_output: '[0, 1]', is_hidden: true, weight: 1 },
    ],
    // 2. Valid Palindrome Filter
    'q-1790330297374-1-drfq': [
      { id: 'tc-1', input: '"A man, a plan, a canal: Panama"', expected_output: 'True', is_hidden: false, weight: 1 },
      { id: 'tc-2', input: '"race a car"', expected_output: 'False', is_hidden: false, weight: 1 },
      { id: 'tc-3', input: '" "', expected_output: 'True', is_hidden: true, weight: 1 },
    ],
    // 3. LRU Cache Access Simulator
    'q-1790239649494-1tnt7': [
      { id: 'tc-1', input: '2 6\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 3', expected_output: '1\n-1\n3', is_hidden: false, weight: 1 },
      { id: 'tc-2', input: '1 4\nPUT 1 10\nGET 1\nPUT 2 20\nGET 1', expected_output: '10\n-1', is_hidden: false, weight: 1 },
      { id: 'tc-3', input: '2 5\nPUT 1 5\nPUT 2 10\nGET 2\nPUT 3 15\nGET 1', expected_output: '10\n-1', is_hidden: true, weight: 1 },
    ],
    // 4. Maximum Circular Subarray Sum
    'q-1790239649114-m18c6': [
      { id: 'tc-1', input: '1 -2 3 -2', expected_output: '3', is_hidden: false, weight: 1 },
      { id: 'tc-2', input: '5 -3 5', expected_output: '10', is_hidden: false, weight: 1 },
      { id: 'tc-3', input: '-3 -2 -3', expected_output: '-2', is_hidden: true, weight: 1 },
    ],
    // 5. Matrix Diagonal Sum
    'q-1790239647921-hev67': [
      { id: 'tc-1', input: '3\n1 2 3\n4 5 6\n7 8 9', expected_output: '25', is_hidden: false, weight: 1 },
      { id: 'tc-2', input: '4\n1 1 1 1\n1 1 1 1\n1 1 1 1\n1 1 1 1', expected_output: '8', is_hidden: false, weight: 1 },
      { id: 'tc-3', input: '1\n5', expected_output: '5', is_hidden: true, weight: 1 },
    ],
    // 6. Valid Anagram Pairs
    'q-1790239647529-w8iox': [
      { id: 'tc-1', input: 'anagram\nnagaram', expected_output: 'true', is_hidden: false, weight: 1 },
      { id: 'tc-2', input: 'rat\ncar', expected_output: 'false', is_hidden: false, weight: 1 },
      { id: 'tc-3', input: 'listen\nsilent', expected_output: 'true', is_hidden: true, weight: 1 },
    ],
  };

  let migratedCount = 0;
  for (const [qId, cases] of Object.entries(specificTestCases)) {
    await client.execute({
      sql: 'UPDATE questions SET test_cases = ? WHERE id = ?',
      args: [JSON.stringify(cases), qId],
    });
    migratedCount++;
  }

  // 4. Verify all questions in DB
  const allQ = await client.execute('SELECT id, title, test_cases, initial_code, starter_code FROM questions');
  const summary = allQ.rows.map((r: any) => {
    const tcs = r.test_cases ? JSON.parse(String(r.test_cases)) : [];
    return {
      id: String(r.id),
      title: String(r.title),
      testCasesCount: tcs.length,
      starterCodeLength: (r.starter_code || r.initial_code || '').length,
    };
  });

  const allHave3 = summary.every((s) => s.testCasesCount === 3);
  const allStarterClean = summary.every((s) => s.starterCodeLength === 0);

  return {
    success: true,
    totalQuestions: summary.length,
    allQuestionsHaveExactlyThreeTestCases: allHave3,
    allQuestionsHaveCleanStarterCode: allStarterClean,
    migratedSpecificQuestionsCount: migratedCount,
    summary,
  };
}
