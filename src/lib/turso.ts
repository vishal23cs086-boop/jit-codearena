import { createClient, type Client } from '@libsql/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import studentsMasterData from '@/data/students-master.json';
import testsMasterData from '@/data/tests-master.json';
import questionsMasterData from '@/data/questions-master.json';

let tursoClientInstance: Client | null = null;
let isInitialized = false;

export function getTursoClient(): Client {
  if (!tursoClientInstance) {
    let url = process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.trim() !== ''
      ? process.env.TURSO_DATABASE_URL
      : '';

    if (!url) {
      if (process.env.VERCEL) {
        // On Vercel serverless execution, the root working directory is read-only.
        // /tmp is the only writable scratch filesystem.
        const tmpDbPath = path.join('/tmp', 'jit_codearena_local.db');
        const seedDbPath = path.join(process.cwd(), 'jit_codearena_local.db');
        if (!fs.existsSync(tmpDbPath) && fs.existsSync(seedDbPath)) {
          try {
            fs.copyFileSync(seedDbPath, tmpDbPath);
          } catch (e) {
            console.warn('Could not copy seed database to /tmp:', e);
          }
        }
        url = `file:${tmpDbPath}`;
      } else {
        url = 'file:jit_codearena_local.db';
      }
    }

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
    );`,

    `CREATE TABLE IF NOT EXISTS pdf_imports (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      uploaded_by TEXT NOT NULL DEFAULT 'admin',
      academic_year INTEGER NOT NULL DEFAULT 2,
      total_pages INTEGER DEFAULT 0,
      questions_extracted INTEGER DEFAULT 0,
      answers_extracted INTEGER DEFAULT 0,
      valid_questions INTEGER DEFAULT 0,
      invalid_questions INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PROCESSING',
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS pdf_import_questions (
      id TEXT PRIMARY KEY,
      import_id TEXT NOT NULL,
      question_number INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer TEXT,
      marks REAL DEFAULT 2,
      academic_year INTEGER NOT NULL DEFAULT 2,
      source_page INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'VALID',
      review_notes TEXT,
      is_duplicate INTEGER DEFAULT 0,
      duplicate_of_id TEXT,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS mcq_submissions (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      test_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      selected_option TEXT,
      correct_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      marks_awarded REAL NOT NULL DEFAULT 0,
      answered_at TEXT,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS assessment_dashboard_state (
      id TEXT PRIMARY KEY,
      assessment_id TEXT DEFAULT 'global',
      completed_count_reset_at TEXT NOT NULL,
      reset_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
    "ALTER TABLE students ADD COLUMN academic_year TEXT DEFAULT '2026-2027';",
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
    'ALTER TABLE code_executions ADD COLUMN execution_number INTEGER DEFAULT 1;',
    "ALTER TABLE questions ADD COLUMN question_type TEXT DEFAULT 'coding';",
    'ALTER TABLE questions ADD COLUMN option_a TEXT;',
    'ALTER TABLE questions ADD COLUMN option_b TEXT;',
    'ALTER TABLE questions ADD COLUMN option_c TEXT;',
    'ALTER TABLE questions ADD COLUMN option_d TEXT;',
    'ALTER TABLE questions ADD COLUMN correct_answer TEXT;',
    'ALTER TABLE questions ADD COLUMN source_pdf TEXT;',
    'ALTER TABLE questions ADD COLUMN source_page INTEGER;',
    'ALTER TABLE questions ADD COLUMN source_question_number INTEGER;',
    "ALTER TABLE tests ADD COLUMN test_type TEXT DEFAULT 'coding';",
    'ALTER TABLE tests ADD COLUMN negative_marking REAL DEFAULT 0;',
    'ALTER TABLE tests ADD COLUMN show_results_immediately INTEGER DEFAULT 1;',
    'CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);',
    'CREATE INDEX IF NOT EXISTS idx_tests_type ON tests(test_type);',
    'CREATE INDEX IF NOT EXISTS idx_pdf_import_questions_import ON pdf_import_questions(import_id);',
    'CREATE INDEX IF NOT EXISTS idx_mcq_subs_attempt ON mcq_submissions(attempt_id);',
    'CREATE INDEX IF NOT EXISTS idx_mcq_subs_test ON mcq_submissions(test_id);',
    'CREATE INDEX IF NOT EXISTS idx_mcq_subs_student ON mcq_submissions(student_id);',
    'CREATE INDEX IF NOT EXISTS idx_dash_state_assess ON assessment_dashboard_state(assessment_id);',
    'CREATE INDEX IF NOT EXISTS idx_dash_state_reset_at ON assessment_dashboard_state(completed_count_reset_at);',
    'ALTER TABLE test_attempts ADD COLUMN termination_reason TEXT;',
    'ALTER TABLE test_attempts ADD COLUMN terminated_at TEXT;',
    'ALTER TABLE test_attempts ADD COLUMN reset_by TEXT;',
    'ALTER TABLE test_attempts ADD COLUMN reset_at TEXT;',
    'ALTER TABLE test_attempts ADD COLUMN reset_reason TEXT;',
    'ALTER TABLE questions ADD COLUMN code_block TEXT;',
    'CREATE INDEX IF NOT EXISTS idx_test_attempts_status ON test_attempts(status);',
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

  // --- AUTOMATIC INSTITUTIONAL SEEDING (ENSURES STUDENTS ARE PRESENT ON VERCEL & ANY ENVIRONMENT) ---
  try {
    const studentCountRes = await client.execute(
      "SELECT COUNT(*) as c FROM students WHERE (account_deleted = 0 OR account_deleted IS NULL) AND (is_archived = 0 OR is_archived IS NULL) AND (status != 'archived' OR status IS NULL)"
    );
    const existingCount = Number(studentCountRes.rows[0]?.c || 0);

    if (existingCount === 0 && Array.isArray(studentsMasterData) && studentsMasterData.length > 0) {
      const now = new Date().toISOString();
      for (const s of studentsMasterData) {
        await client.execute({
          sql: `INSERT INTO students (
                  id, register_number, full_name, email, department, year, section, phone,
                  password_hash, status, is_active, is_archived, account_deleted, session_version,
                  academic_year, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(register_number) DO UPDATE SET
                  full_name = excluded.full_name,
                  department = excluded.department,
                  year = excluded.year,
                  section = excluded.section,
                  academic_year = excluded.academic_year,
                  status = 'active',
                  is_active = 1,
                  is_archived = 0,
                  account_deleted = 0,
                  password_hash = COALESCE(excluded.password_hash, students.password_hash),
                  updated_at = excluded.updated_at`,
          args: [
            s.id,
            s.register_number.trim().toUpperCase(),
            s.full_name.trim(),
            s.email,
            s.department.trim(),
            Number(s.year),
            s.section || 'A',
            s.phone || null,
            s.password_hash,
            s.status || 'active',
            s.is_active ?? 1,
            s.is_archived ?? 0,
            s.account_deleted ?? 0,
            s.session_version ?? 1,
            s.academic_year || '2026-2027',
            s.created_at || now,
            now,
          ],
        });
      }
    }
  } catch (seedErr) {
    console.warn('[Turso] Auto-seed students error:', seedErr);
  }

  try {
    const testCountRes = await client.execute("SELECT COUNT(*) as c FROM tests WHERE is_archived = 0");
    const testCount = Number(testCountRes.rows[0]?.c || 0);
    if (testCount === 0 && Array.isArray(testsMasterData) && testsMasterData.length > 0) {
      for (const t of testsMasterData) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO tests (
            id, title, description, code, instructions, duration, total_marks, passing_marks,
            start_time, end_time, status, is_archived, year, question_count, test_type,
            negative_marking, show_results_immediately, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            t.id, t.title, t.description, t.code, t.instructions, t.duration, t.total_marks,
            t.passing_marks, t.start_time, t.end_time, t.status, t.is_archived, t.year,
            t.question_count, t.test_type || 'coding', t.negative_marking || 0,
            t.show_results_immediately ?? 1, t.created_at, t.updated_at,
          ],
        });
      }
    }

    const questionCountRes = await client.execute("SELECT COUNT(*) as c FROM questions WHERE is_archived = 0");
    const qCount = Number(questionCountRes.rows[0]?.c || 0);
    if (qCount === 0 && Array.isArray(questionsMasterData) && questionsMasterData.length > 0) {
      for (const q of questionsMasterData) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO questions (
            id, test_id, title, description, difficulty, marks, initial_code, solution_code,
            test_cases, time_limit, memory_limit, order_index, year, topic, input_format,
            output_format, constraints, is_archived, is_active, starter_code, question_type,
            option_a, option_b, option_c, option_d, correct_answer, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            q.id, q.test_id, q.title, q.description, q.difficulty, q.marks, q.initial_code,
            q.solution_code, q.test_cases, q.time_limit, q.memory_limit, q.order_index,
            q.year, q.topic, q.input_format, q.output_format, q.constraints, q.is_archived,
            q.is_active, q.starter_code, q.question_type || 'coding', q.option_a, q.option_b,
            q.option_c, q.option_d, q.correct_answer, q.created_at,
          ],
        });
      }
    }
  } catch (seedErr) {
    console.warn('[Turso] Auto-seed tests/questions error:', seedErr);
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
      academic_year: s.academic_year ? String(s.academic_year) : '2026-2027',
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
    is_archived?: boolean | number;
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
    if (data.status !== 'archived' && data.is_archived === undefined && existing.is_archived) {
      updates.push('is_archived = 0');
    }
  }
  if (data.is_archived !== undefined) {
    updates.push('is_archived = ?');
    args.push(data.is_archived ? 1 : 0);
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

export async function unarchiveAssessmentInDb(
  id: string,
  targetStatus: string = 'draft',
  unarchivedBy: string = 'admin'
) {
  await initTursoDb();
  const client = getTursoClient();

  const testRes = await client.execute({
    sql: 'SELECT * FROM tests WHERE id = ?',
    args: [id],
  });

  if (testRes.rows.length === 0) {
    const err: any = new Error('Assessment not found');
    err.status = 404;
    throw err;
  }

  const testRow: any = testRes.rows[0];
  const now = new Date().toISOString();

  // Validate targetStatus
  const allowed = ['draft', 'scheduled', 'live', 'closed'];
  const newStatus = allowed.includes(targetStatus.toLowerCase()) ? targetStatus.toLowerCase() : 'draft';

  // Unarchive: set is_archived = 0, status = newStatus, updated_at = now
  await client.execute({
    sql: 'UPDATE tests SET is_archived = 0, status = ?, updated_at = ? WHERE id = ?',
    args: [newStatus, now, id],
  });

  // Record audit trail in activity_logs
  try {
    await client.execute({
      sql: `INSERT INTO activity_logs (
        id, test_id, student_id, student_name, register_number, event_type, description, metadata, timestamp
      ) VALUES (?, ?, 'ADMIN', ?, 'ADMIN', 'ASSESSMENT_UNARCHIVED', ?, ?, ?)`,
      args: [
        `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        id,
        unarchivedBy,
        `Admin ${unarchivedBy} unarchived assessment "${testRow.title}" (${testRow.code || id}). Restored to ${newStatus.toUpperCase()} status.`,
        JSON.stringify({ unarchived_by: unarchivedBy, unarchived_at: now, assessment_id: id, status: newStatus }),
        now,
      ],
    });
  } catch (err) {
    console.warn('Could not write unarchive audit log:', err);
  }

  const restored = await getAssessmentWithQuestions(id);

  return {
    success: true,
    message: `Assessment "${testRow.title}" unarchived successfully and restored to ${newStatus.toUpperCase()}.`,
    id,
    status: newStatus,
    is_archived: false,
    assessment: restored,
  };
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

  // If this assessment is an MCQ assessment, delegate directly to MCQ engine
  if (test.test_type === 'mcq') {
    return await startOrGetMcqAssessmentAttempt(testId, studentId);
  }

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

  // 6. Check for active or previous attempt (excluding reset attempts)
  const attRes = await client.execute({
    sql: "SELECT * FROM test_attempts WHERE student_id = ? AND test_id = ? AND status != 'reset' ORDER BY start_time DESC LIMIT 1",
    args: [studentId, testId],
  });

  if (attRes.rows.length > 0) {
    const existingAttempt: any = attRes.rows[0];
    const attemptId = String(existingAttempt.id);

    if (existingAttempt.status === 'terminated') {
      const err: any = new Error(existingAttempt.termination_reason || 'Assessment attempt has been terminated due to proctoring violations.');
      err.status = 403;
      err.terminated = true;
      err.attempt = existingAttempt;
      throw err;
    }

    if (existingAttempt.status === 'completed' || existingAttempt.status === 'submitted' || existingAttempt.status === 'auto_submitted') {
      const err: any = new Error('You have already completed and submitted this assessment.');
      err.status = 400;
      err.alreadyCompleted = true;
      err.attemptId = attemptId;
      throw err;
    }

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
          ends_at: String(existingAttempt.ends_at || ''),
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
      ends_at: endsAt,
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
): Promise<{ valid: boolean; error?: string; code?: number; terminated?: boolean }> {
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

      // Status guard: only active attempts can run code or save code
      const currentStatus = String(att.status || '').toLowerCase();
      if (currentStatus === 'terminated') {
        return {
          valid: false,
          error: att.termination_reason || 'Assessment attempt has been terminated due to proctoring violations.',
          code: 403,
          terminated: true,
        };
      }
      if (
        currentStatus === 'completed' ||
        currentStatus === 'submitted' ||
        currentStatus === 'auto_submitted'
      ) {
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
        // IMPORTANT: NEVER mutate test_attempts status here during code execution/validation!
        // Assessment finalization is handled exclusively by /api/assessment/submit, /api/exam/submit-test, or admin termination.
        return {
          valid: false,
          error: 'Assessment deadline has expired.',
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
// DASHBOARD STATS & COUNTER MANAGEMENT
// -------------------------------------------------------------
export async function getDashboardStatsFromDb(assessmentId: string = 'global') {
  await initTursoDb();
  const client = getTursoClient();

  // 1. Fetch active reset timestamp for dashboard completion counter
  let resetRecord: any = null;
  try {
    const resetRes = await client.execute({
      sql: `SELECT completed_count_reset_at, reset_by, assessment_id 
            FROM assessment_dashboard_state 
            WHERE assessment_id = ? OR assessment_id = 'global' 
            ORDER BY completed_count_reset_at DESC LIMIT 1`,
      args: [assessmentId],
    });
    if (resetRes.rows.length > 0) {
      resetRecord = resetRes.rows[0];
    }
  } catch (err) {
    // Graceful fallback if table is initializing
  }

  const resetTimestamp = resetRecord?.completed_count_reset_at ? String(resetRecord.completed_count_reset_at) : null;
  const resetBy = resetRecord?.reset_by ? String(resetRecord.reset_by) : null;

  // 2. Build completion counter query:
  // If resetTimestamp exists: count ONLY completed attempts completed strictly AFTER the reset timestamp
  let completedCountSql = "SELECT COUNT(*) as count FROM test_attempts WHERE (status = 'completed' OR status = 'submitted' OR status = 'auto_submitted')";
  const completedCountArgs: any[] = [];

  if (resetTimestamp) {
    completedCountSql += " AND ((end_time IS NOT NULL AND end_time > ?) OR (end_time IS NULL AND created_at > ?))";
    completedCountArgs.push(resetTimestamp, resetTimestamp);
  }

  const [studentsRes, presenceRes, attemptsRes, allAttemptsRes, violationsRes, terminatedRes] = await Promise.all([
    client.execute("SELECT COUNT(*) as count FROM students WHERE (account_deleted = 0 OR account_deleted IS NULL) AND (is_archived = 0 OR is_archived IS NULL) AND (status != 'archived' OR status IS NULL)"),
    getPresenceListFromDb(),
    client.execute({ sql: completedCountSql, args: completedCountArgs }),
    client.execute("SELECT COUNT(*) as count FROM test_attempts WHERE (status = 'completed' OR status = 'submitted' OR status = 'auto_submitted')"),
    client.execute('SELECT SUM(violation_count) as total_violations FROM student_presence'),
    client.execute("SELECT COUNT(*) as count FROM test_attempts WHERE status = 'terminated'"),
  ]);

  const totalStudents = Number(studentsRes.rows[0]?.count || 0);
  const onlineCount = presenceRes.filter((p) => p.session_status === 'ONLINE' || p.session_status === 'IN_ASSESSMENT' || p.session_status === 'WARNING').length;
  const inAssessmentCount = presenceRes.filter((p) => p.session_status === 'IN_ASSESSMENT' || p.session_status === 'WARNING').length;
  const completedAttempts = Number(attemptsRes.rows[0]?.count || 0);
  const allTimeCompletedAttempts = Number(allAttemptsRes.rows[0]?.count || 0);
  const totalViolations = Number(violationsRes.rows[0]?.total_violations || 0);
  const terminatedCount = Number(terminatedRes.rows[0]?.count || 0);

  const recentLogs = await getActivityLogsFromDb(20);

  return {
    totalStudents,
    onlineCount,
    inAssessmentCount,
    completedAttempts,
    allTimeCompletedAttempts,
    completedCountResetAt: resetTimestamp,
    completedCountResetBy: resetBy,
    totalViolations,
    terminatedCount,
    recentLogs,
  };
}

export async function resetCompletedCountInDb(
  resetBy: string,
  assessmentId: string = 'global'
) {
  await initTursoDb();
  const client = getTursoClient();

  const now = new Date().toISOString();
  const id = `state-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Store new reset state (non-destructive, preserves all actual student attempt rows)
  await client.execute({
    sql: `INSERT INTO assessment_dashboard_state (
      id, assessment_id, completed_count_reset_at, reset_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, assessmentId, now, resetBy, now, now],
  });

  // Record audit trail in activity_logs
  try {
    await client.execute({
      sql: `INSERT INTO activity_logs (
        id, test_id, student_id, student_name, register_number, event_type, description, metadata, timestamp
      ) VALUES (?, ?, 'ADMIN', ?, 'ADMIN', 'DASHBOARD_COMPLETED_RESET', ?, ?, ?)`,
      args: [
        `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        assessmentId === 'global' ? null : assessmentId,
        resetBy,
        `Admin ${resetBy} reset the dashboard completed count for ${assessmentId === 'global' ? 'all assessments' : `assessment ${assessmentId}`}. Historical student attempts were preserved.`,
        JSON.stringify({ reset_by: resetBy, reset_at: now, assessment_id: assessmentId }),
        now,
      ],
    });
  } catch (err) {
    console.warn('Could not write reset audit log:', err);
  }

  return {
    success: true,
    reset_at: now,
    reset_by: resetBy,
    assessment_id: assessmentId,
  };
}

export async function restoreCompletedCountInDb(
  assessmentId: string = 'global',
  restoredBy: string = 'admin'
) {
  await initTursoDb();
  const client = getTursoClient();

  const now = new Date().toISOString();

  await client.execute({
    sql: `DELETE FROM assessment_dashboard_state WHERE assessment_id = ?`,
    args: [assessmentId],
  });

  try {
    await client.execute({
      sql: `INSERT INTO activity_logs (
        id, test_id, student_id, student_name, register_number, event_type, description, metadata, timestamp
      ) VALUES (?, ?, 'ADMIN', ?, 'ADMIN', 'DASHBOARD_COMPLETED_RESTORED', ?, ?, ?)`,
      args: [
        `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        assessmentId === 'global' ? null : assessmentId,
        restoredBy,
        `Admin ${restoredBy} restored the full historical completed count for ${assessmentId === 'global' ? 'all assessments' : `assessment ${assessmentId}`}.`,
        JSON.stringify({ restored_by: restoredBy, restored_at: now, assessment_id: assessmentId }),
        now,
      ],
    });
  } catch (err) {
    console.warn('Could not write restore audit log:', err);
  }

  return { success: true };
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

    case 'terminated': {
      // TERMINATED: Show students with terminated attempts
      const res = await client.execute(`
        SELECT ta.id as attempt_id, ta.test_id, ta.student_id, ta.start_time, ta.end_time,
               ta.score, ta.max_score, ta.status, ta.tab_switches, ta.fullscreen_exits,
               ta.violation_count, ta.termination_reason, ta.terminated_at,
               s.full_name as student_name, s.register_number, s.department, s.year,
               t.title as test_title
        FROM test_attempts ta
        INNER JOIN students s ON ta.student_id = s.id
        LEFT JOIN tests t ON ta.test_id = t.id
        WHERE ta.status = 'terminated'
        ORDER BY ta.terminated_at DESC, ta.start_time DESC
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
        status: 'terminated',
        terminated_at: String(r.terminated_at || r.end_time || ''),
        termination_reason: String(r.termination_reason || 'Excessive proctoring violations recorded (violation_count > 3)'),
        tab_switches: Number(r.tab_switches || 0),
        fullscreen_exits: Number(r.fullscreen_exits || 0),
        violation_count: Number(r.violation_count || 0),
      }));
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
  execution_number?: number;
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
  const execId = data.id || `exec-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  let execNum = data.execution_number;
  if (!execNum && data.attempt_id && data.question_id) {
    try {
      const countRes = await client.execute({
        sql: 'SELECT COUNT(*) as count FROM code_executions WHERE attempt_id = ? AND question_id = ?',
        args: [data.attempt_id, data.question_id],
      });
      execNum = Number(countRes.rows[0]?.count || 0) + 1;
    } catch {
      execNum = 1;
    }
  } else if (!execNum) {
    execNum = 1;
  }

  await client.execute({
    sql: `INSERT INTO code_executions (id, student_id, attempt_id, question_id, source_code, language, execution_status, execution_number, test_cases_passed, test_cases_failed, execution_time, memory_used, stdout, stderr, compile_output, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      execId,
      data.student_id,
      data.attempt_id || null,
      data.question_id || null,
      data.source_code,
      data.language || 'python',
      data.execution_status,
      execNum,
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

  return { id: execId, execution_number: execNum };
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

  if (attempt.status === 'terminated') {
    const err: any = new Error(attempt.termination_reason || 'Assessment attempt has been terminated due to proctoring violations.');
    err.status = 403;
    err.terminated = true;
    throw err;
  }

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

  // Enforce all questions answered before manual submission (Requirement 1)
  if (!isAutoSubmit && assignedQuestions.length > 0) {
    let answeredCount = 0;
    for (const row of assignedQuestions) {
      const qId = String(row.question_id);
      const subRes = await client.execute({
        sql: `SELECT id FROM submissions WHERE (attempt_id = ? OR student_id = ?) AND question_id = ? LIMIT 1`,
        args: [attemptId, studentId, qId],
      });
      let hasAns = subRes.rows.length > 0;
      if (!hasAns && attempt.answers) {
        try {
          const ans = JSON.parse(String(attempt.answers));
          if (ans[qId] && (typeof ans[qId] === 'string' ? ans[qId].trim() : ans[qId].code?.trim())) {
            hasAns = true;
          }
        } catch {}
      }
      if (hasAns) answeredCount++;
    }

    if (answeredCount < assignedQuestions.length) {
      const err: any = new Error(`All questions must be answered before submitting (${answeredCount}/${assignedQuestions.length} answered).`);
      err.status = 400;
      err.answeredCount = answeredCount;
      err.totalQuestions = assignedQuestions.length;
      throw err;
    }
  }

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
                 t.test_type,
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
    test_type: String(att.test_type || (att.max_score === 60 ? 'mcq' : 'coding')),
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
export async function migrateQuestionsToThreeTestCasesAndCleanStarterCode(resetStudentIds?: string[]) {
  await initTursoDb();
  const client = getTursoClient();

  if (Array.isArray(resetStudentIds) && resetStudentIds.length > 0) {
    for (const sId of resetStudentIds) {
      await client.execute({ sql: 'DELETE FROM test_attempts WHERE student_id = ?', args: [sId] });
      await client.execute({ sql: 'DELETE FROM submissions WHERE student_id = ?', args: [sId] });
      await client.execute({ sql: 'DELETE FROM activity_logs WHERE student_id = ?', args: [sId] });
      await client.execute({ sql: 'DELETE FROM code_executions WHERE student_id = ?', args: [sId] });
    }
  }

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

// -------------------------------------------------------------
// ADVANCED MCQ & PDF IMPORT DATABASE FUNCTIONS
// -------------------------------------------------------------

export async function findDuplicateQuestionsInDb(questionText: string, year: number) {
  await initTursoDb();
  const client = getTursoClient();

  const cleanText = questionText.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleanText.length < 10) return { isDuplicate: false };

  const res = await client.execute({
    sql: 'SELECT id, title, description FROM questions WHERE year = ? AND (is_archived = 0 OR is_archived IS NULL)',
    args: [year],
  });

  const words = cleanText.split(' ').filter((w) => w.length > 2);
  if (words.length === 0) return { isDuplicate: false };

  for (const row of res.rows) {
    const existingClean = `${row.title} ${row.description || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (existingClean === cleanText) {
      return { isDuplicate: true, duplicateId: String(row.id), title: String(row.title) };
    }

    const existingWords = new Set(existingClean.split(' ').filter((w) => w.length > 2));
    let matchCount = 0;
    for (const w of words) {
      if (existingWords.has(w)) matchCount++;
    }
    const similarity = matchCount / Math.max(words.length, existingWords.size);
    if (similarity >= 0.85) {
      return { isDuplicate: true, duplicateId: String(row.id), title: String(row.title) };
    }
  }

  return { isDuplicate: false };
}

export async function createPdfImportInDb(data: {
  filename: string;
  uploaded_by?: string;
  academic_year: number;
  total_pages: number;
  questions_extracted: number;
  answers_extracted: number;
  valid_questions: number;
  invalid_questions: number;
  status: string;
  error_message?: string | null;
  questions: Array<{
    question_number: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer?: string | null;
    marks?: number;
    academic_year: number;
    source_page: number;
    status: string;
    review_notes?: string | null;
    is_duplicate?: number;
    duplicate_of_id?: string | null;
  }>;
}) {
  await initTursoDb();
  const client = getTursoClient();

  const importId = `imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO pdf_imports (
      id, filename, uploaded_by, academic_year, total_pages,
      questions_extracted, answers_extracted, valid_questions, invalid_questions,
      status, error_message, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      importId,
      data.filename,
      data.uploaded_by || 'admin',
      data.academic_year,
      data.total_pages,
      data.questions_extracted,
      data.answers_extracted,
      data.valid_questions,
      data.invalid_questions,
      data.status,
      data.error_message || null,
      now,
      now,
    ],
  });

  for (const q of data.questions) {
    const qId = `impq-${Date.now()}-${q.question_number}-${Math.random().toString(36).substring(2, 6)}`;
    await client.execute({
      sql: `INSERT INTO pdf_import_questions (
        id, import_id, question_number, question_text, option_a, option_b, option_c, option_d,
        correct_answer, marks, academic_year, source_page, status, review_notes,
        is_duplicate, duplicate_of_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        qId,
        importId,
        q.question_number,
        q.question_text,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_answer || null,
        q.marks || 2,
        q.academic_year,
        q.source_page,
        q.status,
        q.review_notes || null,
        q.is_duplicate || 0,
        q.duplicate_of_id || null,
        now,
      ],
    });
  }

  return { importId, status: data.status };
}

export async function getPdfImportFromDb(importId: string) {
  await initTursoDb();
  const client = getTursoClient();

  const res = await client.execute({
    sql: 'SELECT * FROM pdf_imports WHERE id = ? LIMIT 1',
    args: [importId],
  });

  if (res.rows.length === 0) return null;
  const row: any = res.rows[0];

  return {
    id: String(row.id),
    filename: String(row.filename),
    uploaded_by: String(row.uploaded_by),
    academic_year: Number(row.academic_year),
    total_pages: Number(row.total_pages || 0),
    questions_extracted: Number(row.questions_extracted || 0),
    answers_extracted: Number(row.answers_extracted || 0),
    valid_questions: Number(row.valid_questions || 0),
    invalid_questions: Number(row.invalid_questions || 0),
    status: String(row.status),
    error_message: row.error_message ? String(row.error_message) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getPdfImportQuestionsFromDb(importId: string) {
  await initTursoDb();
  const client = getTursoClient();

  const res = await client.execute({
    sql: 'SELECT * FROM pdf_import_questions WHERE import_id = ? ORDER BY question_number ASC',
    args: [importId],
  });

  return res.rows.map((row: any) => ({
    id: String(row.id),
    import_id: String(row.import_id),
    question_number: Number(row.question_number),
    question_text: String(row.question_text),
    option_a: String(row.option_a || ''),
    option_b: String(row.option_b || ''),
    option_c: String(row.option_c || ''),
    option_d: String(row.option_d || ''),
    correct_answer: row.correct_answer ? String(row.correct_answer) : null,
    marks: Number(row.marks || 2),
    academic_year: Number(row.academic_year || 2),
    source_page: Number(row.source_page || 1),
    status: String(row.status),
    review_notes: row.review_notes ? String(row.review_notes) : null,
    is_duplicate: Number(row.is_duplicate || 0),
    duplicate_of_id: row.duplicate_of_id ? String(row.duplicate_of_id) : null,
    created_at: String(row.created_at),
  }));
}

export async function updatePdfImportQuestionInDb(
  qId: string,
  data: {
    question_text?: string;
    option_a?: string;
    option_b?: string;
    option_c?: string;
    option_d?: string;
    correct_answer?: string | null;
    marks?: number;
    status?: string;
    review_notes?: string | null;
  }
) {
  await initTursoDb();
  const client = getTursoClient();

  const updates: string[] = [];
  const args: any[] = [];

  if (data.question_text !== undefined) {
    updates.push('question_text = ?');
    args.push(data.question_text.trim());
  }
  if (data.option_a !== undefined) {
    updates.push('option_a = ?');
    args.push(data.option_a.trim());
  }
  if (data.option_b !== undefined) {
    updates.push('option_b = ?');
    args.push(data.option_b.trim());
  }
  if (data.option_c !== undefined) {
    updates.push('option_c = ?');
    args.push(data.option_c.trim());
  }
  if (data.option_d !== undefined) {
    updates.push('option_d = ?');
    args.push(data.option_d.trim());
  }
  if (data.correct_answer !== undefined) {
    updates.push('correct_answer = ?');
    args.push(data.correct_answer ? data.correct_answer.toUpperCase().trim() : null);
  }
  if (data.marks !== undefined) {
    updates.push('marks = ?');
    args.push(Number(data.marks));
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    args.push(data.status);
  }
  if (data.review_notes !== undefined) {
    updates.push('review_notes = ?');
    args.push(data.review_notes);
  }

  if (updates.length > 0) {
    args.push(qId);
    await client.execute({
      sql: `UPDATE pdf_import_questions SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });
  }

  const res = await client.execute({
    sql: 'SELECT * FROM pdf_import_questions WHERE id = ? LIMIT 1',
    args: [qId],
  });

  return res.rows[0] ? (res.rows[0] as any) : null;
}

export async function deletePdfImportQuestionInDb(qId: string) {
  await initTursoDb();
  const client = getTursoClient();

  const findRes = await client.execute({
    sql: 'SELECT import_id FROM pdf_import_questions WHERE id = ? LIMIT 1',
    args: [qId],
  });

  const importId = findRes.rows[0]?.import_id ? String(findRes.rows[0].import_id) : null;

  await client.execute({
    sql: 'DELETE FROM pdf_import_questions WHERE id = ?',
    args: [qId],
  });

  if (importId) {
    const countRes = await client.execute({
      sql: `SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'VALID' OR status = 'APPROVED' THEN 1 ELSE 0 END) as valids,
              SUM(CASE WHEN status = 'NEEDS_REVIEW' OR status = 'DUPLICATE' THEN 1 ELSE 0 END) as invalids
            FROM pdf_import_questions WHERE import_id = ?`,
      args: [importId],
    });
    const row = countRes.rows[0];
    if (row) {
      await client.execute({
        sql: 'UPDATE pdf_imports SET questions_extracted = ?, valid_questions = ?, invalid_questions = ? WHERE id = ?',
        args: [Number(row.total || 0), Number(row.valids || 0), Number(row.invalids || 0), importId],
      });
    }
  }

  return { success: true };
}

export async function validatePdfImportInDb(importId: string) {
  await initTursoDb();
  const client = getTursoClient();

  const questionsRes = await client.execute({
    sql: 'SELECT * FROM pdf_import_questions WHERE import_id = ? ORDER BY question_number ASC',
    args: [importId],
  });

  const rows = questionsRes.rows;
  const issues: Array<{ question_number: number; error: string }> = [];
  const seenNumbers = new Set<number>();
  let validCount = 0;
  let reviewCount = 0;
  let totalMarks = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const qNum = Number(row.question_number);
    const qText = String(row.question_text || '').trim();
    const optA = String(row.option_a || '').trim();
    const optB = String(row.option_b || '').trim();
    const optC = String(row.option_c || '').trim();
    const optD = String(row.option_d || '').trim();
    const key = row.correct_answer ? String(row.correct_answer).toUpperCase().trim() : '';
    const marks = Number(row.marks || 2);
    totalMarks += marks;

    const rowIssues: string[] = [];

    if (seenNumbers.has(qNum)) {
      rowIssues.push(`Duplicate question number ${qNum}`);
    }
    seenNumbers.add(qNum);

    if (qText.length < 5) rowIssues.push('Question text is missing or too short');
    if (!optA) rowIssues.push('Option A is missing');
    if (!optB) rowIssues.push('Option B is missing');
    if (!optC) rowIssues.push('Option C is missing');
    if (!optD) rowIssues.push('Option D is missing');
    if (!key || !['A', 'B', 'C', 'D'].includes(key)) rowIssues.push('Valid correct answer (A, B, C, D) is required');
    if (marks <= 0) rowIssues.push('Marks must be greater than 0');

    // Duplicate options check
    const opts = [optA, optB, optC, optD].filter(Boolean);
    if (new Set(opts).size < opts.length) {
      rowIssues.push('Duplicate option texts detected');
    }

    // Intra-paper duplicate question text check (Exact match or > 85% token overlap)
    let isDuplicateQuestion = false;
    let duplicateOfQNum: number | null = null;
    const normCurrent = qText.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const wordsCurrent = new Set(normCurrent.split(' ').filter((w) => w.length > 2));

    for (let prevIdx = 0; prevIdx < idx; prevIdx++) {
      const prevRow = rows[prevIdx];
      const prevText = String(prevRow.question_text || '').trim();
      const normPrev = prevText.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

      if (normCurrent && normPrev) {
        if (normCurrent === normPrev) {
          isDuplicateQuestion = true;
          duplicateOfQNum = Number(prevRow.question_number);
          rowIssues.push(`Exact duplicate of Question ${duplicateOfQNum}`);
          break;
        }

        const wordsPrev = new Set(normPrev.split(' ').filter((w) => w.length > 2));
        if (wordsCurrent.size > 0 && wordsPrev.size > 0) {
          let common = 0;
          for (const w of wordsCurrent) {
            if (wordsPrev.has(w)) common++;
          }
          const union = new Set([...wordsCurrent, ...wordsPrev]).size;
          const similarity = union > 0 ? common / union : 0;
          if (similarity >= 0.85) {
            isDuplicateQuestion = true;
            duplicateOfQNum = Number(prevRow.question_number);
            rowIssues.push(`Similar question (${Math.round(similarity * 100)}% match) of Question ${duplicateOfQNum}`);
            break;
          }
        }
      }
    }

    if (isDuplicateQuestion) {
      reviewCount++;
      issues.push({ question_number: qNum, error: rowIssues.join('; ') });
      await client.execute({
        sql: "UPDATE pdf_import_questions SET status = 'DUPLICATE', is_duplicate = 1, duplicate_of_id = ?, review_notes = ? WHERE id = ?",
        args: [String(duplicateOfQNum), rowIssues.join('; '), String(row.id)],
      });
    } else if (rowIssues.length > 0) {
      reviewCount++;
      issues.push({ question_number: qNum, error: rowIssues.join('; ') });
      await client.execute({
        sql: "UPDATE pdf_import_questions SET status = 'NEEDS_REVIEW', is_duplicate = 0, duplicate_of_id = NULL, review_notes = ? WHERE id = ?",
        args: [rowIssues.join('; '), String(row.id)],
      });
    } else {
      validCount++;
      await client.execute({
        sql: "UPDATE pdf_import_questions SET status = 'VALID', is_duplicate = 0, duplicate_of_id = NULL, review_notes = NULL WHERE id = ?",
        args: [String(row.id)],
      });
    }
  }

  const isAllValid = reviewCount === 0 && rows.length > 0;
  await client.execute({
    sql: 'UPDATE pdf_imports SET questions_extracted = ?, valid_questions = ?, invalid_questions = ?, status = ? WHERE id = ?',
    args: [rows.length, validCount, reviewCount, isAllValid ? 'READY' : 'REVIEW_REQUIRED', importId],
  });

  return {
    valid: isAllValid,
    totalQuestions: rows.length,
    validCount,
    reviewCount,
    totalMarks,
    issues,
  };
}

export async function approvePdfImportQuestionsInDb(importId: string, questionIds?: string[]) {
  await initTursoDb();
  const client = getTursoClient();

  const imp = await getPdfImportFromDb(importId);
  if (!imp) throw new Error('PDF Import record not found.');

  let sql = 'SELECT * FROM pdf_import_questions WHERE import_id = ?';
  const args: any[] = [importId];

  if (Array.isArray(questionIds) && questionIds.length > 0) {
    sql += ` AND id IN (${questionIds.map(() => '?').join(',')})`;
    args.push(...questionIds);
  } else {
    // Approve all valid or approved questions
    sql += " AND status != 'REJECTED'";
  }

  const res = await client.execute({ sql, args });
  // Exclude duplicate questions from being approved
  const questionsToApprove = res.rows.filter((q: any) => !q.is_duplicate && q.status !== 'DUPLICATE' && q.status !== 'REJECTED');

  if (questionsToApprove.length === 0) {
    throw new Error('No eligible questions found to approve (unresolved duplicates or invalid questions detected).');
  }

  const now = new Date().toISOString();
  let approvedCount = 0;
  const createdQuestionIds: string[] = [];

  for (const q of questionsToApprove) {
    const qRow: any = q;
    const finalQId = `q-mcq-${Date.now()}-${qRow.question_number}-${Math.random().toString(36).substring(2, 6)}`;

    await client.execute({
      sql: `INSERT INTO questions (
        id, test_id, title, description, question_type, option_a, option_b, option_c, option_d,
        correct_answer, marks, year, topic, difficulty, source_pdf, source_page,
        source_question_number, is_active, is_archived, created_at
      ) VALUES (?, 'bank', ?, ?, 'mcq', ?, ?, ?, ?, ?, ?, ?, 'General MCQ', 'Medium', ?, ?, ?, 1, 0, ?)`,
      args: [
        finalQId,
        qRow.question_text.slice(0, 100).trim(),
        qRow.question_text.trim(),
        qRow.option_a,
        qRow.option_b,
        qRow.option_c,
        qRow.option_d,
        (qRow.correct_answer || 'A').toUpperCase().trim(),
        Number(qRow.marks || 2),
        Number(qRow.academic_year || imp.academic_year || 2),
        imp.filename,
        Number(qRow.source_page || 1),
        Number(qRow.question_number),
        now,
      ],
    });

    await client.execute({
      sql: "UPDATE pdf_import_questions SET status = 'APPROVED' WHERE id = ?",
      args: [qRow.id],
    });

    createdQuestionIds.push(finalQId);
    approvedCount++;
  }

  await client.execute({
    sql: "UPDATE pdf_imports SET status = 'IMPORTED', updated_at = ? WHERE id = ?",
    args: [now, importId],
  });

  return {
    success: true,
    importId,
    approvedCount,
    createdQuestionIds,
  };
}

export async function createMcqAssessmentInDb(data: {
  title: string;
  code?: string;
  description?: string;
  instructions?: string;
  year: number;
  duration_minutes?: number;
  question_count?: number;
  marks_per_question?: number;
  passing_marks?: number;
  start_time?: string;
  end_time?: string;
  status?: string;
  import_id?: string;
  question_ids?: string[];
}) {
  await initTursoDb();
  const client = getTursoClient();

  const title = (data.title || '').trim();
  if (!title) throw new Error('Assessment title is required.');

  const testYear = Number(data.year);
  if (testYear !== 2 && testYear !== 3) {
    throw new Error('Academic year must be strictly 2 (2nd Year) or 3 (3rd Year).');
  }

  const duration = Number(data.duration_minutes || 60);
  const qCount = Number(data.question_count || 30);
  const marksPerQ = Number(data.marks_per_question || 2);
  const totalMarks = qCount * marksPerQ;
  const passingMarks = Number(data.passing_marks !== undefined ? data.passing_marks : Math.round(totalMarks * 0.4));

  const testId = `test-mcq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  let code = (data.code || '').trim().toUpperCase();
  if (!code) {
    code = `JIT-Y${testYear}-MCQ-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  await client.execute({
    sql: `INSERT INTO tests (
      id, title, description, code, instructions, duration, total_marks,
      passing_marks, start_time, end_time, status, year, question_count,
      test_type, is_archived, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'mcq', 0, ?, ?)`,
    args: [
      testId,
      title,
      data.description ? data.description.trim() : `MCQ Assessment for Year ${testYear} students.`,
      code,
      data.instructions || 'Select the correct option for each question. Answers are saved automatically.',
      duration,
      totalMarks,
      passingMarks,
      data.start_time || null,
      data.end_time || null,
      data.status || 'published',
      testYear,
      qCount,
      now,
      now,
    ],
  });

  // Attach questions to this test if provided
  if (Array.isArray(data.question_ids) && data.question_ids.length > 0) {
    for (let i = 0; i < data.question_ids.length; i++) {
      const qId = data.question_ids[i];
      await client.execute({
        sql: 'UPDATE questions SET test_id = ? WHERE id = ?',
        args: [testId, qId],
      });
    }
  }

  return {
    id: testId,
    title,
    code,
    year: testYear,
    duration,
    question_count: qCount,
    total_marks: totalMarks,
    passing_marks: passingMarks,
    test_type: 'mcq',
    status: data.status || 'published',
  };
}

export async function startOrGetMcqAssessmentAttempt(testId: string, studentId: string) {
  await initTursoDb();
  const client = getTursoClient();

  // 1. Fetch test
  const testRes = await client.execute({
    sql: 'SELECT * FROM tests WHERE id = ? LIMIT 1',
    args: [testId],
  });
  if (testRes.rows.length === 0) {
    const err: any = new Error('Assessment not found.');
    err.status = 404;
    throw err;
  }
  const test: any = testRes.rows[0];

  // 2. Fetch student
  const studentRes = await client.execute({
    sql: 'SELECT * FROM students WHERE id = ? LIMIT 1',
    args: [studentId],
  });
  if (studentRes.rows.length === 0) {
    const err: any = new Error('Student not found.');
    err.status = 404;
    throw err;
  }
  const student: any = studentRes.rows[0];

  // 3. Strict Academic Year Isolation Guard
  if (Number(student.year) !== Number(test.year)) {
    const err: any = new Error(
      `Access Denied: This assessment is restricted to Year ${test.year} students. Your registered profile is Year ${student.year}.`
    );
    err.status = 403;
    throw err;
  }

  // 4. Check for existing attempt (excluding reset attempts)
  const existingAttemptRes = await client.execute({
    sql: `SELECT * FROM test_attempts 
          WHERE test_id = ? AND student_id = ? AND status != 'reset'
          ORDER BY created_at DESC LIMIT 1`,
    args: [testId, studentId],
  });

  const now = new Date().toISOString();
  const durationMin = Number(test.duration || 60);

  if (existingAttemptRes.rows.length > 0) {
    const existingAttempt: any = existingAttemptRes.rows[0];
    const attemptId = String(existingAttempt.id);

    // Fetch frozen assigned questions in order
    const assignedQRes = await client.execute({
      sql: `SELECT q.id, q.title, q.description, q.option_a, q.option_b, q.option_c, q.option_d,
                   q.marks, q.year, aq.question_order
            FROM attempt_questions aq
            JOIN questions q ON aq.question_id = q.id
            WHERE aq.attempt_id = ?
            ORDER BY aq.question_order ASC`,
      args: [attemptId],
    });

    let answers: Record<string, any> = {};
    if (existingAttempt.answers) {
      try {
        answers = JSON.parse(String(existingAttempt.answers));
      } catch {}
    }

    // Sanitize questions: NEVER leak correct_answer to client!
    const sanitizedQuestions = assignedQRes.rows.map((row: any) => ({
      id: String(row.id),
      question_number: Number(row.question_order),
      question_text: String(row.description || row.title),
      option_a: String(row.option_a || ''),
      option_b: String(row.option_b || ''),
      option_c: String(row.option_c || ''),
      option_d: String(row.option_d || ''),
      marks: Number(row.marks || 2),
      year: Number(row.year),
    }));

    return {
      isExisting: true,
      attempt: {
        id: attemptId,
        test_id: testId,
        student_id: studentId,
        start_time: String(existingAttempt.start_time),
        ends_at: String(existingAttempt.ends_at || ''),
        status: String(existingAttempt.status),
        score: Number(existingAttempt.score || 0),
        max_score: Number(existingAttempt.max_score || test.total_marks || 60),
        answers,
      },
      test: {
        id: String(test.id),
        title: String(test.title),
        description: String(test.description || ''),
        duration: durationMin,
        duration_minutes: durationMin,
        total_marks: Number(test.total_marks || 60),
        passing_marks: Number(test.passing_marks || 24),
        year: Number(test.year),
        test_type: 'mcq',
      },
      questions: sanitizedQuestions,
    };
  }

  // 5. New Attempt: Randomize and assign frozen question set
  const poolRes = await client.execute({
    sql: `SELECT id FROM questions 
          WHERE (year = ? OR test_id = ?) 
            AND question_type = 'mcq'
            AND (is_archived = 0 OR is_archived IS NULL)
            AND (is_active = 1 OR is_active IS NULL)`,
    args: [Number(test.year), testId],
  });

  let poolIds = Array.from(new Set(poolRes.rows.map((r: any) => String(r.id))));
  if (poolIds.length === 0) {
    // If no questions marked specifically as 'mcq', check all questions attached to test
    const testSpecificRes = await client.execute({
      sql: 'SELECT id FROM questions WHERE test_id = ? AND (is_archived = 0 OR is_archived IS NULL)',
      args: [testId],
    });
    poolIds = Array.from(new Set(testSpecificRes.rows.map((r: any) => String(r.id))));
  }

  if (poolIds.length === 0) {
    const err: any = new Error(`No MCQ questions are currently available for Year ${test.year}.`);
    err.status = 400;
    throw err;
  }

  // Shuffle question pool (Fisher-Yates)
  for (let i = poolIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [poolIds[i], poolIds[j]] = [poolIds[j], poolIds[i]];
  }

  const targetCount = Math.min(poolIds.length, Number(test.question_count || 30));
  const selectedQuestionIds = poolIds.slice(0, targetCount);

  const attemptId = `att-mcq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const endsAt = new Date(Date.now() + durationMin * 60 * 1000).toISOString();

  // Create attempt in test_attempts
  await client.execute({
    sql: `INSERT INTO test_attempts (
      id, test_id, student_id, start_time, ends_at, status, score,
      max_score, answers, created_at
    ) VALUES (?, ?, ?, ?, ?, 'in_progress', 0, ?, '{}', ?)`,
    args: [
      attemptId,
      testId,
      studentId,
      now,
      endsAt,
      Number(test.total_marks || targetCount * 2),
      now,
    ],
  });

  // Freeze assigned questions in attempt_questions table
  for (let i = 0; i < selectedQuestionIds.length; i++) {
    const qId = selectedQuestionIds[i];
    const aqId = `aq-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
    await client.execute({
      sql: `INSERT INTO attempt_questions (id, attempt_id, question_id, question_order, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [aqId, attemptId, qId, i + 1, now],
    });
  }

  // Retrieve assigned questions
  const qDetailsRes = await client.execute({
    sql: `SELECT q.id, q.title, q.description, q.option_a, q.option_b, q.option_c, q.option_d,
                 q.marks, q.year, aq.question_order
          FROM attempt_questions aq
          JOIN questions q ON aq.question_id = q.id
          WHERE aq.attempt_id = ?
          ORDER BY aq.question_order ASC`,
    args: [attemptId],
  });

  const sanitizedQuestions = qDetailsRes.rows.map((row: any) => ({
    id: String(row.id),
    question_number: Number(row.question_order),
    question_text: String(row.description || row.title),
    option_a: String(row.option_a || ''),
    option_b: String(row.option_b || ''),
    option_c: String(row.option_c || ''),
    option_d: String(row.option_d || ''),
    marks: Number(row.marks || 2),
    year: Number(row.year),
  }));

  return {
    isExisting: false,
    attempt: {
      id: attemptId,
      test_id: testId,
      student_id: studentId,
      start_time: now,
      ends_at: endsAt,
      status: 'in_progress',
      score: 0,
      max_score: Number(test.total_marks || targetCount * 2),
      answers: {},
    },
    test: {
      id: String(test.id),
      title: String(test.title),
      description: String(test.description || ''),
      duration: durationMin,
      duration_minutes: durationMin,
      total_marks: Number(test.total_marks || targetCount * 2),
      passing_marks: Number(test.passing_marks || Math.round(targetCount * 2 * 0.4)),
      year: Number(test.year),
      test_type: 'mcq',
    },
    questions: sanitizedQuestions,
  };
}

export async function saveStudentMcqAnswerInDb(
  attemptId: string,
  questionId: string,
  studentId: string,
  selectedOption: string | null
) {
  await initTursoDb();
  const client = getTursoClient();

  const attRes = await client.execute({
    sql: 'SELECT * FROM test_attempts WHERE id = ? LIMIT 1',
    args: [attemptId],
  });
  if (attRes.rows.length === 0) throw new Error('Assessment attempt not found.');
  const attempt: any = attRes.rows[0];

  if (String(attempt.student_id) !== studentId) {
    throw new Error('Unauthorized: Student ID does not match assessment attempt owner.');
  }

  const currentStatus = String(attempt.status || '').toLowerCase();
  if (currentStatus === 'terminated') {
    const err: any = new Error(attempt.termination_reason || 'Assessment attempt has been terminated due to proctoring violations.');
    err.status = 403;
    err.terminated = true;
    throw err;
  }
  if (currentStatus === 'completed' || currentStatus === 'submitted' || currentStatus === 'auto_submitted') {
    throw new Error('Assessment attempt has already concluded. No further answer submissions permitted.');
  }

  // Timer check
  if (attempt.ends_at) {
    const endsAtMs = new Date(attempt.ends_at).getTime();
    if (Date.now() > endsAtMs + 5000) {
      throw new Error('Assessment deadline has expired.');
    }
  }

  let answers: Record<string, any> = {};
  if (attempt.answers) {
    try {
      answers = JSON.parse(String(attempt.answers));
    } catch {}
  }

  const now = new Date().toISOString();
  if (selectedOption) {
    answers[questionId] = {
      selected_option: selectedOption.toUpperCase().trim(),
      updated_at: now,
    };
  } else {
    delete answers[questionId];
  }

  await client.execute({
    sql: 'UPDATE test_attempts SET answers = ? WHERE id = ?',
    args: [JSON.stringify(answers), attemptId],
  });

  return { success: true, saved_at: now };
}

export async function submitStudentMcqAssessmentInDb(
  testId: string,
  studentId: string,
  attemptId: string,
  options?: { isAutoSubmit?: boolean }
) {
  await initTursoDb();
  const client = getTursoClient();

  const attRes = await client.execute({
    sql: 'SELECT * FROM test_attempts WHERE id = ? AND student_id = ? LIMIT 1',
    args: [attemptId, studentId],
  });
  if (attRes.rows.length === 0) throw new Error('Attempt not found for student.');
  const attempt: any = attRes.rows[0];

  if (attempt.status === 'terminated') {
    const err: any = new Error(attempt.termination_reason || 'Assessment attempt has been terminated due to proctoring violations.');
    err.status = 403;
    err.terminated = true;
    throw err;
  }

  const testRes = await client.execute({
    sql: 'SELECT * FROM tests WHERE id = ? LIMIT 1',
    args: [testId],
  });
  if (testRes.rows.length === 0) throw new Error('Test not found.');
  const test: any = testRes.rows[0];

  // Fetch assigned questions with authoritative correct_answer from database
  const qRes = await client.execute({
    sql: `SELECT q.id, q.title, q.description, q.option_a, q.option_b, q.option_c, q.option_d,
                 q.correct_answer, q.marks, aq.question_order
          FROM attempt_questions aq
          JOIN questions q ON aq.question_id = q.id
          WHERE aq.attempt_id = ?
          ORDER BY aq.question_order ASC`,
    args: [attemptId],
  });

  let studentAnswers: Record<string, any> = {};
  if (attempt.answers) {
    try {
      studentAnswers = JSON.parse(String(attempt.answers));
    } catch {}
  }

  // Pre-calculate answered count & validate completion
  let answeredCount = 0;
  for (const row of qRes.rows) {
    const qId = String(row.id);
    const studentAnsObj = studentAnswers[qId];
    const studentChoice = typeof studentAnsObj === 'object' && studentAnsObj?.selected_option
      ? studentAnsObj.selected_option
      : (typeof studentAnsObj === 'string' ? studentAnsObj : null);
    if (studentChoice && String(studentChoice).trim()) {
      answeredCount++;
    }
  }

  const isAutoSubmit = Boolean(options?.isAutoSubmit);
  if (!isAutoSubmit && qRes.rows.length > 0 && answeredCount < qRes.rows.length) {
    const err: any = new Error(`All questions must be answered before submitting (${answeredCount}/${qRes.rows.length} answered).`);
    err.status = 400;
    err.answeredCount = answeredCount;
    err.totalQuestions = qRes.rows.length;
    throw err;
  }

  const now = new Date().toISOString();
  let totalQuestions = qRes.rows.length;
  answeredCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let marksObtained = 0;
  let maxMarks = 0;

  const detailedResults: any[] = [];

  for (const row of qRes.rows) {
    const q: any = row;
    const qId = String(q.id);
    const qMarks = Number(q.marks || 2);
    maxMarks += qMarks;

    const correctAns = (q.correct_answer || '').toUpperCase().trim();
    const studentAnsObj = studentAnswers[qId];
    const studentChoice = typeof studentAnsObj === 'object' && studentAnsObj?.selected_option
      ? studentAnsObj.selected_option
      : (typeof studentAnsObj === 'string' ? studentAnsObj : null);

    const isAnswered = Boolean(studentChoice);
    const isCorrect = isAnswered && studentChoice.toUpperCase().trim() === correctAns;

    let marksAwarded = 0;
    if (isAnswered) {
      answeredCount++;
      if (isCorrect) {
        correctCount++;
        marksAwarded = qMarks;
        marksObtained += qMarks;
      } else {
        incorrectCount++;
      }
    }

    const subId = `mcqsub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await client.execute({
      sql: `INSERT INTO mcq_submissions (
        id, attempt_id, test_id, student_id, question_id, selected_option,
        correct_answer, is_correct, marks_awarded, answered_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        subId,
        attemptId,
        testId,
        studentId,
        qId,
        studentChoice || null,
        correctAns,
        isCorrect ? 1 : 0,
        marksAwarded,
        studentAnsObj?.updated_at || now,
        now,
      ],
    });

    detailedResults.push({
      question_id: qId,
      question_order: Number(q.question_order),
      question_text: String(q.description || q.title),
      selected_option: studentChoice || null,
      correct_answer: correctAns,
      is_correct: isCorrect,
      marks_awarded: marksAwarded,
      max_marks: qMarks,
    });
  }

  const unansweredCount = totalQuestions - answeredCount;
  const percentage = maxMarks > 0 ? Math.round((marksObtained / maxMarks) * 10000) / 100 : 0;

  const startTimeMs = new Date(attempt.start_time).getTime();
  const endTimeMs = new Date(now).getTime();
  const timeTakenSeconds = Math.max(0, Math.round((endTimeMs - startTimeMs) / 1000));

  // Update test_attempts in Turso
  await client.execute({
    sql: `UPDATE test_attempts 
          SET status = 'completed', end_time = ?, score = ?, max_score = ?,
              percentage = ?, time_taken_seconds = ?, question_results = ?
          WHERE id = ?`,
    args: [
      now,
      marksObtained,
      maxMarks,
      percentage,
      timeTakenSeconds,
      JSON.stringify(detailedResults),
      attemptId,
    ],
  });

  // Re-rank all completed attempts for this test: Score DESC, time_taken_seconds ASC
  const allCompletedRes = await client.execute({
    sql: `SELECT id FROM test_attempts 
          WHERE test_id = ? AND status IN ('completed', 'submitted', 'auto_submitted')
          ORDER BY score DESC, time_taken_seconds ASC, end_time ASC`,
    args: [testId],
  });

  for (let r = 0; r < allCompletedRes.rows.length; r++) {
    const rankId = String(allCompletedRes.rows[r].id);
    await client.execute({
      sql: 'UPDATE test_attempts SET completion_rank = ? WHERE id = ?',
      args: [r + 1, rankId],
    });
  }

  return {
    success: true,
    attempt_id: attemptId,
    test_id: testId,
    student_id: studentId,
    total_questions: totalQuestions,
    answered: answeredCount,
    answered_count: answeredCount,
    correct: correctCount,
    correct_count: correctCount,
    incorrect: incorrectCount,
    incorrect_count: incorrectCount,
    unanswered: unansweredCount,
    unanswered_count: unansweredCount,
    marks_obtained: marksObtained,
    score: marksObtained,
    maximum_marks: maxMarks,
    max_score: maxMarks,
    percentage,
    time_taken_seconds: timeTakenSeconds,
    status: 'completed',
    results: detailedResults,
  };
}

export async function getMcqAssessmentAnalyticsFromDb(testId: string) {
  await initTursoDb();
  const client = getTursoClient();

  const testRes = await client.execute({
    sql: 'SELECT * FROM tests WHERE id = ? LIMIT 1',
    args: [testId],
  });
  if (testRes.rows.length === 0) throw new Error('Test not found.');
  const test: any = testRes.rows[0];

  // Attempts summary
  const attRes = await client.execute({
    sql: `SELECT ta.*, s.register_number, s.full_name, s.department, s.year as student_year
          FROM test_attempts ta
          JOIN students s ON ta.student_id = s.id
          WHERE ta.test_id = ?
          ORDER BY ta.score DESC, ta.time_taken_seconds ASC`,
    args: [testId],
  });

  const totalStarted = attRes.rows.length;
  const completedAttempts = attRes.rows.filter((a: any) =>
    ['completed', 'submitted', 'auto_submitted'].includes(String(a.status).toLowerCase())
  );
  const inProgressCount = totalStarted - completedAttempts.length;

  let totalScore = 0;
  let highestScore = 0;
  let lowestScore = completedAttempts.length > 0 ? 999999 : 0;
  let totalTime = 0;

  for (const c of completedAttempts) {
    const sc = Number(c.score || 0);
    totalScore += sc;
    if (sc > highestScore) highestScore = sc;
    if (sc < lowestScore) lowestScore = sc;
    totalTime += Number(c.time_taken_seconds || 0);
  }

  const averageScore = completedAttempts.length > 0 ? Math.round((totalScore / completedAttempts.length) * 10) / 10 : 0;
  const averageTimeSeconds = completedAttempts.length > 0 ? Math.round(totalTime / completedAttempts.length) : 0;

  // Question-wise accuracy stats
  const qAccuracyRes = await client.execute({
    sql: `SELECT q.id as question_id, q.title, q.description,
                 COUNT(ms.id) as total_attempts,
                 SUM(CASE WHEN ms.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
                 SUM(CASE WHEN ms.is_correct = 0 AND ms.selected_option IS NOT NULL THEN 1 ELSE 0 END) as incorrect_count
          FROM questions q
          LEFT JOIN mcq_submissions ms ON q.id = ms.question_id AND ms.test_id = ?
          WHERE (q.test_id = ? OR q.id IN (SELECT question_id FROM attempt_questions WHERE attempt_id IN (SELECT id FROM test_attempts WHERE test_id = ?)))
          GROUP BY q.id
          ORDER BY q.created_at ASC`,
    args: [testId, testId, testId],
  });

  const questionStats = qAccuracyRes.rows.map((row: any, idx: number) => {
    const totalAtt = Number(row.total_attempts || 0);
    const cor = Number(row.correct_count || 0);
    const incor = Number(row.incorrect_count || 0);
    const unans = totalAtt - cor - incor;
    const accuracy = totalAtt > 0 ? Math.round((cor / totalAtt) * 10000) / 100 : 0;

    return {
      question_number: idx + 1,
      question_id: String(row.question_id),
      question_text: String(row.description || row.title),
      total_attempts: totalAtt,
      correct: cor,
      incorrect: incor,
      unanswered: Math.max(0, unans),
      accuracy_percentage: accuracy,
    };
  });

  // Leaderboard
  const leaderboard = completedAttempts.map((row: any, index: number) => ({
    rank: Number(row.completion_rank || index + 1),
    student_id: String(row.student_id),
    register_number: String(row.register_number),
    full_name: String(row.full_name),
    department: String(row.department || 'CSE'),
    score: Number(row.score || 0),
    max_score: Number(row.max_score || test.total_marks || 60),
    percentage: Number(row.percentage || 0),
    time_taken_seconds: Number(row.time_taken_seconds || 0),
    status: String(row.status),
    completed_at: row.end_time ? String(row.end_time) : null,
  }));

  return {
    test: {
      id: String(test.id),
      title: String(test.title),
      code: String(test.code || ''),
      year: Number(test.year),
      total_marks: Number(test.total_marks),
      duration: Number(test.duration),
    },
    summary: {
      total_students_started: totalStarted,
      completed_count: completedAttempts.length,
      in_progress_count: inProgressCount,
      average_score: averageScore,
      highest_score: highestScore,
      lowest_score: lowestScore === 999999 ? 0 : lowestScore,
      average_time_seconds: averageTimeSeconds,
    },
    leaderboard,
    question_stats: questionStats,
  };
}

export async function getMcqStudentResultDrilldownFromDb(testId: string, studentId: string) {
  await initTursoDb();
  const client = getTursoClient();

  const attRes = await client.execute({
    sql: `SELECT ta.*, s.register_number, s.full_name, s.department, s.year as student_year,
                 t.title as test_title, t.total_marks as test_total_marks, t.passing_marks as test_passing_marks
          FROM test_attempts ta
          JOIN students s ON ta.student_id = s.id
          JOIN tests t ON ta.test_id = t.id
          WHERE ta.test_id = ? AND ta.student_id = ?
          ORDER BY ta.created_at DESC LIMIT 1`,
    args: [testId, studentId],
  });

  if (attRes.rows.length === 0) return null;
  const att: any = attRes.rows[0];

  const subRes = await client.execute({
    sql: `SELECT ms.*, q.title, q.description, q.option_a, q.option_b, q.option_c, q.option_d, q.marks
          FROM mcq_submissions ms
          JOIN questions q ON ms.question_id = q.id
          WHERE ms.attempt_id = ?
          ORDER BY ms.created_at ASC`,
    args: [att.id],
  });

  return {
    student: {
      id: String(att.student_id),
      register_number: String(att.register_number),
      full_name: String(att.full_name),
      department: String(att.department),
      year: Number(att.student_year),
    },
    assessment: {
      id: String(att.test_id),
      title: String(att.test_title),
      total_marks: Number(att.test_total_marks),
      passing_marks: Number(att.test_passing_marks),
    },
    attempt: {
      id: String(att.id),
      start_time: String(att.start_time),
      end_time: att.end_time ? String(att.end_time) : null,
      score: Number(att.score || 0),
      percentage: Number(att.percentage || 0),
      time_taken_seconds: Number(att.time_taken_seconds || 0),
      completion_rank: Number(att.completion_rank || 1),
      status: String(att.status),
    },
    questions: subRes.rows.map((row: any, idx: number) => ({
      question_number: idx + 1,
      question_id: String(row.question_id),
      question_text: String(row.description || row.title),
      option_a: String(row.option_a || ''),
      option_b: String(row.option_b || ''),
      option_c: String(row.option_c || ''),
      option_d: String(row.option_d || ''),
      selected_option: row.selected_option ? String(row.selected_option) : null,
      correct_answer: String(row.correct_answer),
      is_correct: Number(row.is_correct) === 1,
      marks_awarded: Number(row.marks_awarded || 0),
      max_marks: Number(row.marks || 2),
    })),
  };
}

// -------------------------------------------------------------
// SERVER-SIDE ASSESSMENT RANKINGS ENGINE (DETERMINISTIC)
// -------------------------------------------------------------
export async function getAssessmentRankingsFromDb(params: {
  testId?: string;
  year?: number;
  search?: string;
  status?: string;
}) {
  await initTursoDb();
  const client = getTursoClient();

  const conditions: string[] = [];
  const args: any[] = [];

  if (params.testId && params.testId !== 'all') {
    conditions.push('ta.test_id = ?');
    args.push(params.testId);
  }
  if (params.year && params.year > 0) {
    conditions.push('s.year = ?');
    args.push(Number(params.year));
  }
  if (params.status && params.status !== 'all') {
    conditions.push('ta.status = ?');
    args.push(params.status);
  } else {
    // By default, exclude reset attempts from ranking display unless explicitly requested
    conditions.push("ta.status != 'reset'");
  }
  if (params.search && params.search.trim()) {
    const s = `%${params.search.trim()}%`;
    conditions.push('(s.full_name LIKE ? OR s.register_number LIKE ?)');
    args.push(s, s);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Deterministic order:
  // 1. score DESC (highest score first)
  // 2. time_taken_seconds ASC (fastest completion breaks ties)
  // 3. end_time ASC (earlier submission breaks further ties)
  // 4. ta.id ASC (tie-breaker is non-random)
  const query = `
    SELECT ta.id as attempt_id, ta.test_id, ta.student_id, ta.start_time, ta.end_time,
           ta.score, ta.max_score, ta.percentage, ta.time_taken_seconds, ta.status,
           ta.tab_switches, ta.fullscreen_exits, ta.violation_count, ta.termination_reason, ta.terminated_at,
           s.full_name as student_name, s.register_number, s.department, s.year as student_year,
           t.title as test_title, t.total_marks as test_total_marks, t.test_type,
           (SELECT COUNT(*) FROM attempt_questions aq WHERE aq.attempt_id = ta.id) as total_questions,
           (
             CASE 
               WHEN t.test_type = 'mcq' THEN (SELECT COUNT(*) FROM mcq_submissions ms WHERE ms.attempt_id = ta.id AND ms.selected_option IS NOT NULL AND ms.selected_option != '')
               ELSE (SELECT COUNT(DISTINCT sub.question_id) FROM submissions sub WHERE (sub.attempt_id = ta.id OR sub.student_id = ta.student_id))
             END
           ) as attempted_questions
    FROM test_attempts ta
    INNER JOIN students s ON ta.student_id = s.id
    LEFT JOIN tests t ON ta.test_id = t.id
    ${whereClause}
    ORDER BY 
      CASE WHEN ta.status IN ('completed', 'submitted', 'auto_submitted') THEN 1 ELSE 2 END ASC,
      ta.score DESC,
      CASE WHEN ta.time_taken_seconds > 0 THEN ta.time_taken_seconds ELSE 999999 END ASC,
      CASE WHEN ta.end_time IS NOT NULL THEN ta.end_time ELSE '9999-12-31' END ASC,
      ta.id ASC
  `;

  const res = await client.execute({ sql: query, args });

  return res.rows.map((r: any, idx: number) => {
    const timeTaken = Number(r.time_taken_seconds || 0);
    const mins = Math.floor(timeTaken / 60);
    const secs = timeTaken % 60;
    const timeTakenDisplay = timeTaken > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : '-';

    const totalQ = Number(r.total_questions || 30);
    const attemptedQ = Number(r.attempted_questions || (r.status === 'completed' ? totalQ : 0));

    return {
      rank: idx + 1,
      attempt_id: String(r.attempt_id),
      student_id: String(r.student_id),
      student_name: String(r.student_name || 'Candidate'),
      register_number: String(r.register_number),
      department: String(r.department || 'CSE'),
      year: Number(r.student_year || 2),
      test_id: String(r.test_id),
      test_title: String(r.test_title || 'Assessment'),
      test_type: String(r.test_type || 'coding'),
      score: Number(r.score || 0),
      max_score: Number(r.max_score || r.test_total_marks || 60),
      percentage: Number(r.percentage || (r.max_score ? Math.round((Number(r.score || 0) / Number(r.max_score)) * 100) : 0)),
      time_taken_seconds: timeTaken,
      time_taken_display: timeTakenDisplay,
      questions_attempted: `${attemptedQ} / ${totalQ}`,
      attempted_count: attemptedQ,
      total_questions: totalQ,
      status: String(r.status),
      end_time: r.end_time ? String(r.end_time) : null,
      completed_at_display: r.end_time ? new Date(r.end_time).toLocaleString() : '-',
      termination_reason: r.termination_reason ? String(r.termination_reason) : null,
      terminated_at: r.terminated_at ? String(r.terminated_at) : null,
      violation_count: Number(r.violation_count || 0),
    };
  });
}

// -------------------------------------------------------------
// ADMIN ACTION: RESTORE TERMINATED STUDENT
// -------------------------------------------------------------
export async function restoreTerminatedStudentInDb(
  studentId: string,
  testId?: string,
  restoredBy: string = 'admin',
  reason: string = 'Administrative review and clearance'
) {
  await initTursoDb();
  const client = getTursoClient();

  const query = testId
    ? "SELECT * FROM test_attempts WHERE student_id = ? AND test_id = ? AND status = 'terminated' ORDER BY created_at DESC LIMIT 1"
    : "SELECT * FROM test_attempts WHERE student_id = ? AND status = 'terminated' ORDER BY created_at DESC LIMIT 1";
  const args = testId ? [studentId, testId] : [studentId];

  const attRes = await client.execute({ sql: query, args });
  if (attRes.rows.length === 0) {
    throw new Error('No terminated assessment attempt found for this student.');
  }

  const attempt: any = attRes.rows[0];
  const targetAttemptId = String(attempt.id);
  const targetTestId = String(attempt.test_id);
  const now = new Date().toISOString();

  // Restore attempt status to 'in_progress', preserve violation logs and violation count
  await client.execute({
    sql: `UPDATE test_attempts 
          SET status = 'in_progress', 
              termination_reason = NULL, 
              terminated_at = NULL 
          WHERE id = ?`,
    args: [targetAttemptId],
  });

  // Restore student presence
  await client.execute({
    sql: `UPDATE student_presence 
          SET session_status = 'IN_ASSESSMENT', 
              active_assessment_id = ? 
          WHERE student_id = ?`,
    args: [targetTestId, studentId],
  });

  // Record audited admin action in activity_logs
  await recordActivityLogInDb({
    test_id: targetTestId,
    student_id: studentId,
    event_type: 'ADMIN_RESTORE_TERMINATION',
    description: `Termination removed by ${restoredBy}. Reason: ${reason}. Attempt restored to in_progress.`,
    metadata: {
      attempt_id: targetAttemptId,
      restored_by: restoredBy,
      reason,
      restored_at: now,
      previous_violations: attempt.violation_count || 0,
    },
  });

  return {
    success: true,
    attempt_id: targetAttemptId,
    test_id: targetTestId,
    restored_at: now,
  };
}

// -------------------------------------------------------------
// ADMIN ACTION: RESET ASSESSMENT ATTEMPT FOR INDIVIDUAL STUDENT
// -------------------------------------------------------------
export async function resetStudentAssessmentAttemptInDb(
  studentId: string,
  testId: string,
  resetBy: string = 'admin',
  reason: string = 'Administrative re-attempt grant'
) {
  await initTursoDb();
  const client = getTursoClient();

  // Fetch the current/latest attempt (regardless of status, but not already reset)
  const attRes = await client.execute({
    sql: "SELECT * FROM test_attempts WHERE student_id = ? AND test_id = ? AND status != 'reset' ORDER BY created_at DESC LIMIT 1",
    args: [studentId, testId],
  });

  const now = new Date().toISOString();

  if (attRes.rows.length > 0) {
    const attempt: any = attRes.rows[0];
    const attemptId = String(attempt.id);

    // Mark attempt as 'reset' (NEVER delete!)
    await client.execute({
      sql: `UPDATE test_attempts 
            SET status = 'reset', 
                reset_by = ?, 
                reset_at = ?, 
                reset_reason = ? 
            WHERE id = ?`,
      args: [resetBy, now, reason, attemptId],
    });
  }

  // Clear student presence active assessment
  await client.execute({
    sql: `UPDATE student_presence 
          SET session_status = 'ONLINE', 
              active_assessment_id = NULL, 
              violation_count = 0, 
              current_question_index = 0 
          WHERE student_id = ?`,
    args: [studentId],
  });

  // Record audited admin action in activity_logs
  await recordActivityLogInDb({
    test_id: testId,
    student_id: studentId,
    event_type: 'ADMIN_RESET_ASSESSMENT',
    description: `Assessment reset by ${resetBy}. Reason: ${reason}. Old attempt archived as reset, student can start fresh.`,
    metadata: {
      test_id: testId,
      reset_by: resetBy,
      reason,
      reset_at: now,
    },
  });

  return {
    success: true,
    student_id: studentId,
    test_id: testId,
    reset_at: now,
  };
}

// -------------------------------------------------------------
// ADMIN ACTION: SAFE CLEANUP / ARCHIVE FOR TESTS & UNUSED QUESTIONS
// -------------------------------------------------------------
export async function cleanupAssessmentsAndQuestionsInDb(params: {
  target: 'draft_tests' | 'unused_questions';
  adminName: string;
}) {
  await initTursoDb();
  const client = getTursoClient();
  const now = new Date().toISOString();
  let affectedCount = 0;

  if (params.target === 'draft_tests') {
    // Only archive tests in 'draft' status that have NO student attempts
    const testsRes = await client.execute(`
      SELECT t.id, t.title FROM tests t
      WHERE t.status = 'draft' AND t.is_archived = 0
        AND NOT EXISTS (SELECT 1 FROM test_attempts ta WHERE ta.test_id = t.id)
    `);
    for (const row of testsRes.rows) {
      await client.execute({
        sql: 'UPDATE tests SET is_archived = 1, status = "archived", updated_at = ? WHERE id = ?',
        args: [now, String(row.id)],
      });
      affectedCount++;
    }
  } else if (params.target === 'unused_questions') {
    // Only archive questions that have NEVER been used in attempts or submissions
    const qRes = await client.execute(`
      SELECT q.id FROM questions q
      WHERE (q.is_archived = 0 OR q.is_archived IS NULL)
        AND NOT EXISTS (SELECT 1 FROM attempt_questions aq WHERE aq.question_id = q.id)
        AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.question_id = q.id)
        AND NOT EXISTS (SELECT 1 FROM mcq_submissions ms WHERE ms.question_id = q.id)
    `);
    for (const row of qRes.rows) {
      await client.execute({
        sql: 'UPDATE questions SET is_archived = 1, is_active = 0 WHERE id = ?',
        args: [String(row.id)],
      });
      affectedCount++;
    }
  }

  await recordActivityLogInDb({
    student_id: 'admin',
    student_name: params.adminName || 'Admin',
    event_type: 'ADMIN_DATA_CLEANUP',
    description: `Safe cleanup executed for ${params.target}. Affected ${affectedCount} records without deleting student data or submissions.`,
    metadata: { target: params.target, affected_count: affectedCount, executed_by: params.adminName, timestamp: now },
  });

  return { success: true, affectedCount, target: params.target, executedAt: now };
}


