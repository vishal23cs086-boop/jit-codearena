const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = { raw: data };
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('===============================================================');
  console.log('STARTING CRITICAL STUDENT DELETION & LOGIN ACCESS TEST SUITE');
  console.log('===============================================================\n');

  const reg1 = `T${Date.now().toString().slice(-6)}`;
  console.log(`[TEST 1] Registering student ${reg1}...`);
  const regRes = await request('POST', '/api/auth/register', {
    fullName: 'Test Candidate One',
    registerNumber: reg1,
    department: 'CSE',
    year: 2,
    section: 'A',
    password: 'Password@123',
  });
  assert(regRes.statusCode === 200, `Student registration succeeded (status ${regRes.statusCode})`);
  assert(regRes.data.user && regRes.data.user.id, 'User object returned with ID');
  const student1Id = regRes.data.user.id;

  console.log('\n[TEST 2] Logging in as student...');
  const loginRes = await request('POST', '/api/auth/student-login', {
    registerNumber: reg1,
    password: 'Password@123',
  });
  assert(loginRes.statusCode === 200, `Login succeeded (status ${loginRes.statusCode})`);
  assert(loginRes.data.user.session_version >= 1, `session_version is present: ${loginRes.data.user.session_version}`);
  const s1Version = loginRes.data.user.session_version;

  console.log('\n[TEST 3] Sending presence heartbeat...');
  const hbRes = await request('POST', '/api/presence/heartbeat', {
    student_id: student1Id,
    session_version: s1Version,
    register_number: reg1,
    full_name: 'Test Candidate One',
    department: 'CSE',
    year: 2,
    section: 'A',
    current_page: '/student/dashboard',
  });
  assert(hbRes.statusCode === 200, `Heartbeat accepted (status ${hbRes.statusCode})`);

  console.log('\n[TEST 4] Checking student appears in Live Monitor (/api/admin/presence)...');
  const monRes = await request('GET', '/api/admin/presence');
  assert(monRes.statusCode === 200, 'Admin presence query succeeded');
  const inPresence = (monRes.data.students || []).find((s) => s.student_id === student1Id);
  assert(Boolean(inPresence), 'Student is visible in Live Monitor');

  console.log('\n[TEST 5] Testing Account Disabling: Admin disables student account...');
  const disRes = await request('PATCH', `/api/admin/students/${student1Id}/status`, {
    status: 'disabled',
  });
  assert(disRes.statusCode === 200, 'Admin disabled student account successfully');

  console.log('\n[TEST 6] Verifying disabled student disappears from Live Monitor...');
  const monRes2 = await request('GET', '/api/admin/presence');
  const inPresence2 = (monRes2.data.students || []).find((s) => s.student_id === student1Id);
  assert(!inPresence2, 'Disabled student does NOT appear in Live Monitor');

  console.log('\n[TEST 7] Verifying disabled student heartbeat is rejected with 401...');
  const hbResDis = await request('POST', '/api/presence/heartbeat', {
    student_id: student1Id,
    session_version: s1Version,
    register_number: reg1,
  });
  assert(hbResDis.statusCode === 401, `Heartbeat rejected with HTTP 401 (got ${hbResDis.statusCode})`);

  console.log('\n[TEST 8] Verifying disabled student /api/student/session-check returns 401...');
  const sessDis = await request('POST', '/api/student/session-check', {
    student_id: student1Id,
    session_version: s1Version,
  });
  assert(sessDis.statusCode === 401, `Session check rejected with HTTP 401 (got ${sessDis.statusCode})`);

  console.log('\n[TEST 9] Verifying disabled student login is rejected with HTTP 403...');
  const loginDis = await request('POST', '/api/auth/student-login', {
    registerNumber: reg1,
    password: 'Password@123',
  });
  assert(loginDis.statusCode === 403, `Login rejected with HTTP 403 (got ${loginDis.statusCode})`);

  console.log('\n[TEST 10] Testing Account Enabling: Admin re-enables student account...');
  const enRes = await request('PATCH', `/api/admin/students/${student1Id}/status`, {
    status: 'active',
  });
  assert(enRes.statusCode === 200, 'Admin re-enabled student account');

  console.log('\n[TEST 11] Verifying enabled student can log in again...');
  const loginEn = await request('POST', '/api/auth/student-login', {
    registerNumber: reg1,
    password: 'Password@123',
  });
  assert(loginEn.statusCode === 200, `Login succeeded after enable (got ${loginEn.statusCode})`);
  assert(loginEn.data.user.session_version > s1Version, `session_version was incremented: ${loginEn.data.user.session_version}`);

  // =========================================================================
  // PERMANENT DELETION (NO HISTORY)
  // =========================================================================
  const regNoHist = `NH${Date.now().toString().slice(-6)}`;
  console.log(`\n[TEST 12] Registering student without exam history (${regNoHist})...`);
  const regNoHistRes = await request('POST', '/api/auth/register', {
    fullName: 'Test Candidate No History',
    registerNumber: regNoHist,
    department: 'IT',
    year: 2,
    password: 'Password@123',
  });
  assert(regNoHistRes.statusCode === 200, 'Student without history registered');
  const noHistId = regNoHistRes.data.user.id;
  const noHistSessionVersion = regNoHistRes.data.user.session_version || 1;

  // Send heartbeat so they appear in presence
  await request('POST', '/api/presence/heartbeat', {
    student_id: noHistId,
    session_version: noHistSessionVersion,
    register_number: regNoHist,
    full_name: 'Test Candidate No History',
    department: 'IT',
    year: 2,
  });

  console.log('\n[TEST 13] Admin permanently deletes student without history...');
  const delRes = await request('DELETE', `/api/admin/students/${noHistId}`);
  assert(delRes.statusCode === 200, 'Delete request returned HTTP 200');
  assert(delRes.data.action === 'deleted', `Action was 'deleted' (got ${delRes.data.action})`);

  console.log('\n[TEST 14] Verifying student is removed from Admin Students list...');
  const listRes = await request('GET', '/api/admin/students');
  const foundInList = (listRes.data.students || []).find((s) => s.id === noHistId);
  assert(!foundInList, 'Student does not exist in Admin Students list');

  console.log('\n[TEST 15] Verifying deleted student does NOT appear in Live Monitor...');
  const monRes3 = await request('GET', '/api/admin/presence');
  const foundInMon = (monRes3.data.students || []).find((s) => s.student_id === noHistId);
  assert(!foundInMon, 'Deleted student does NOT appear in Live Monitor');

  console.log('\n[TEST 16] Verifying deleted student heartbeat returns HTTP 401...');
  const hbDelRes = await request('POST', '/api/presence/heartbeat', {
    student_id: noHistId,
    session_version: noHistSessionVersion,
    register_number: regNoHist,
  });
  assert(hbDelRes.statusCode === 401, `Deleted student heartbeat rejected with HTTP 401 (got ${hbDelRes.statusCode})`);

  console.log('\n[TEST 17] Verifying deleted student /api/student/session-check returns HTTP 401...');
  const sessDelRes = await request('POST', '/api/student/session-check', {
    student_id: noHistId,
    session_version: noHistSessionVersion,
  });
  assert(sessDelRes.statusCode === 401, `Deleted student session-check rejected with HTTP 401 (got ${sessDelRes.statusCode})`);

  console.log('\n[TEST 18] Verifying deleted student login returns HTTP 401 with "Invalid register number or password."...');
  const loginDelRes = await request('POST', '/api/auth/student-login', {
    registerNumber: regNoHist,
    password: 'Password@123',
  });
  assert(loginDelRes.statusCode === 401, `Deleted student login rejected with HTTP 401 (got ${loginDelRes.statusCode})`);
  assert(
    loginDelRes.data.error === 'Invalid register number or password.',
    `Returned exact message "Invalid register number or password." (got "${loginDelRes.data.error}")`
  );

  console.log('\n[TEST 19] Verifying direct API calls with deleted student session fail with HTTP 401:');

  const startAttRes = await request('POST', '/api/exam/start-attempt', {
    testId: 'test-y2-midterm',
    studentId: noHistId,
    session_version: noHistSessionVersion,
  });
  assert(startAttRes.statusCode === 401, `start-attempt rejected with HTTP 401 (got ${startAttRes.statusCode})`);

  const saveCodeRes = await request('POST', '/api/exam/save-code', {
    attemptId: 'att-123',
    questionId: 'q-1',
    studentId: noHistId,
    code: 'def solution(): pass',
    session_version: noHistSessionVersion,
  });
  assert(saveCodeRes.statusCode === 401, `save-code rejected with HTTP 401 (got ${saveCodeRes.statusCode})`);

  const submitTestRes = await request('POST', '/api/exam/submit-test', {
    attemptId: 'att-123',
    studentId: noHistId,
    session_version: noHistSessionVersion,
  });
  assert(submitTestRes.statusCode === 401, `submit-test rejected with HTTP 401 (got ${submitTestRes.statusCode})`);

  const logActRes = await request('POST', '/api/exam/log-activity', {
    studentId: noHistId,
    eventType: 'TAB_SWITCH',
    session_version: noHistSessionVersion,
  });
  assert(logActRes.statusCode === 401, `log-activity rejected with HTTP 401 (got ${logActRes.statusCode})`);

  const codeRunRes = await request('POST', '/api/code/run', {
    code: 'print("hello")',
    studentId: noHistId,
    questionId: 'q-py-1',
    session_version: noHistSessionVersion,
  });
  assert(codeRunRes.statusCode === 401, `code/run rejected with HTTP 401 (got ${codeRunRes.statusCode})`);

  const codeSubmitRes = await request('POST', '/api/code/submit', {
    code: 'print("hello")',
    studentId: noHistId,
    questionId: 'q-py-1',
    session_version: noHistSessionVersion,
  });
  assert(codeSubmitRes.statusCode === 401, `code/submit rejected with HTTP 401 (got ${codeSubmitRes.statusCode})`);

  // =========================================================================
  // ARCHIVE & DISABLE (WITH HISTORY)
  // =========================================================================
  const regHist = `WH${Date.now().toString().slice(-6)}`;
  console.log(`\n[TEST 20] Registering student with exam history (${regHist})...`);
  const regHistRes = await request('POST', '/api/auth/register', {
    fullName: 'Test Candidate With History',
    registerNumber: regHist,
    department: 'CSE',
    year: 2,
    password: 'Password@123',
  });
  assert(regHistRes.statusCode === 200, 'Student with history registered');
  const histId = regHistRes.data.user.id;
  const histSessionVersion = regHistRes.data.user.session_version || 1;

  // Fetch a valid Year 2 assessment ID
  const assListRes = await request('GET', '/api/admin/assessments');
  const y2Test = (assListRes.data.assessments || []).find((t) => Number(t.year) === 2);
  const testIdToUse = y2Test ? y2Test.id : 'test-2nd-year-py';

  console.log(`\n[TEST 21] Creating assessment attempt for student using ${testIdToUse}...`);
  const startHistAtt = await request('POST', '/api/exam/start-attempt', {
    testId: testIdToUse,
    studentId: histId,
    session_version: histSessionVersion,
  });
  assert(startHistAtt.statusCode === 200, `Assessment attempt created (status ${startHistAtt.statusCode})`);

  console.log('\n[TEST 22] Admin deletes student WITH history (should trigger Archive & Disable)...');
  const delHistRes = await request('DELETE', `/api/admin/students/${histId}`);
  assert(delHistRes.statusCode === 200, 'Delete request returned HTTP 200');
  assert(delHistRes.data.action === 'archived', `Action was 'archived' (got ${delHistRes.data.action})`);

  console.log('\n[TEST 23] Verifying archived student is NOT visible in Live Monitor...');
  const monRes4 = await request('GET', '/api/admin/presence');
  const foundInMon2 = (monRes4.data.students || []).find((s) => s.student_id === histId);
  assert(!foundInMon2, 'Archived student does NOT appear in Live Monitor');

  console.log('\n[TEST 24] Verifying archived student old session is rejected with HTTP 401...');
  const hbHistRes = await request('POST', '/api/presence/heartbeat', {
    student_id: histId,
    session_version: histSessionVersion,
    register_number: regHist,
  });
  assert(hbHistRes.statusCode === 401, `Archived student heartbeat rejected with HTTP 401 (got ${hbHistRes.statusCode})`);

  const sessHistRes = await request('POST', '/api/student/session-check', {
    student_id: histId,
    session_version: histSessionVersion,
  });
  assert(sessHistRes.statusCode === 401, `Archived student session check rejected with HTTP 401 (got ${sessHistRes.statusCode})`);

  console.log('\n[TEST 25] Verifying archived student login returns HTTP 403 ("Your student account has been archived. Login access is no longer permitted.")...');
  const loginHistRes = await request('POST', '/api/auth/student-login', {
    registerNumber: regHist,
    password: 'Password@123',
  });
  assert(loginHistRes.statusCode === 403, `Archived student login rejected with HTTP 403 (got ${loginHistRes.statusCode})`);
  assert(
    loginHistRes.data.error === 'Your student account has been archived. Login access is no longer permitted.',
    `Returned exact message "Your student account has been archived. Login access is no longer permitted." (got "${loginHistRes.data.error}")`
  );

  console.log('\n===============================================================');
  console.log('🎉 ALL 25 COMPREHENSIVE VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
