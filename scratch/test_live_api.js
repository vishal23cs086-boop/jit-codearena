const BASE_URL = 'https://jit-codearena.vercel.app';

async function testLiveDeployment() {
  console.log('================================================================');
  console.log('   JIT CodeArena Live Production Deployment Verification        ');
  console.log('   URL: ' + BASE_URL);
  console.log('================================================================\n');

  let passed = 0;
  function assert(cond, msg) {
    if (!cond) {
      console.error('❌ FAIL:', msg);
      throw new Error(msg);
    }
    console.log('✅ PASS:', msg);
    passed++;
  }

  // 1. Year 2 Question Bank Filter
  console.log('--- 1. Testing GET /api/admin/questions?year=2 ---');
  const resY2 = await fetch(`${BASE_URL}/api/admin/questions?year=2`);
  const dataY2 = await resY2.json();
  assert(dataY2.success === true, 'API returned success: true');
  assert(dataY2.questions.length > 0, `Returned ${dataY2.questions.length} Year 2 questions`);
  assert(dataY2.questions.every(q => q.year === 2), '100% of returned questions have year === 2');

  // 2. Year 3 Question Bank Filter
  console.log('\n--- 2. Testing GET /api/admin/questions?year=3 ---');
  const resY3 = await fetch(`${BASE_URL}/api/admin/questions?year=3`);
  const dataY3 = await resY3.json();
  assert(dataY3.success === true, 'API returned success: true');
  assert(dataY3.questions.length > 0, `Returned ${dataY3.questions.length} Year 3 questions`);
  assert(dataY3.questions.every(q => q.year === 3), '100% of returned questions have year === 3');

  // 3. Question Bank Stats
  console.log('\n--- 3. Testing Question Bank Stats ---');
  const resStats = await fetch(`${BASE_URL}/api/admin/questions?stats=true`);
  const dataStats = await resStats.json();
  assert(dataStats.success === true, 'Stats endpoint returned success: true');
  assert(dataStats.stats.year2Count >= 4, `Year 2 pool count: ${dataStats.stats.year2Count}`);
  assert(dataStats.stats.year3Count >= 4, `Year 3 pool count: ${dataStats.stats.year3Count}`);
  assert(dataStats.stats.totalCount >= 8, `Total questions: ${dataStats.stats.totalCount}`);

  // 4. Ensure students exist for testing
  console.log('\n--- 4. Registering / Logging in Test Candidates ---');
  let stud2ndId = '';
  const reg2nd = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Aravind Swaminathan',
      registerNumber: '23CS099',
      department: 'CSE',
      year: 2,
      section: 'A',
      password: 'password123'
    })
  });
  const dataReg2nd = await reg2nd.json();
  if (dataReg2nd.user?.id) {
    stud2ndId = dataReg2nd.user.id;
  } else {
    // Already registered, log in
    const login2nd = await fetch(`${BASE_URL}/api/auth/student-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registerNumber: '23CS099', password: 'password123' })
    });
    const dataLogin2nd = await login2nd.json();
    stud2ndId = dataLogin2nd.user?.id;
  }

  let stud3rdId = '';
  const reg3rd = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Divya Bharathi',
      registerNumber: '22CS099',
      department: 'CSE',
      year: 3,
      section: 'B',
      password: 'password123'
    })
  });
  const dataReg3rd = await reg3rd.json();
  if (dataReg3rd.user?.id) {
    stud3rdId = dataReg3rd.user.id;
  } else {
    // Already registered, log in
    const login3rd = await fetch(`${BASE_URL}/api/auth/student-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registerNumber: '22CS099', password: 'password123' })
    });
    const dataLogin3rd = await login3rd.json();
    stud3rdId = dataLogin3rd.user?.id;
  }

  console.log(`Test students retrieved: Year 2 (${stud2ndId}), Year 3 (${stud3rdId})`);

  // 5. Fetch Assessment IDs for Year 2 and Year 3
  console.log('\n--- 5. Locating Assessments for Year 2 and Year 3 ---');
  const testsRes = await fetch(`${BASE_URL}/api/admin/assessments`);
  const testsData = await testsRes.json();
  const test2nd = testsData.assessments.find(t => t.year === 2);
  const test3rd = testsData.assessments.find(t => t.year === 3);
  assert(Boolean(test2nd), `Found 2nd Year Assessment (${test2nd?.id})`);
  assert(Boolean(test3rd), `Found 3rd Year Assessment (${test3rd?.id})`);

  // 6. Test Start Attempt: 2nd Year Student Starts 2nd Year Test
  console.log('\n--- 6. 2nd Year Candidate Starts 2nd Year Assessment ---');
  const startY2 = await fetch(`${BASE_URL}/api/exam/start-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testId: test2nd.id,
      studentId: stud2ndId
    })
  });
  const dataAttemptY2 = await startY2.json();
  assert(startY2.status === 200, `Start attempt status 200`);
  assert(dataAttemptY2.success === true, 'Attempt created successfully');
  assert(dataAttemptY2.questions.length === 2, `Assigned exactly 2 questions (configured count)`);
  assert(dataAttemptY2.questions.every(q => q.year === 2), 'ALL assigned questions have year === 2');
  console.log(`Assigned questions: [${dataAttemptY2.questions.map(q => `${q.id} (Yr ${q.year})`).join(', ')}]`);

  // 7. Test Start Attempt: 3rd Year Student Starts 3rd Year Test
  console.log('\n--- 7. 3rd Year Candidate Starts 3rd Year Assessment ---');
  const startY3 = await fetch(`${BASE_URL}/api/exam/start-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testId: test3rd.id,
      studentId: stud3rdId
    })
  });
  const dataAttemptY3 = await startY3.json();
  assert(startY3.status === 200, `Start attempt status 200`);
  assert(dataAttemptY3.success === true, 'Attempt created successfully');
  assert(dataAttemptY3.questions.length === 2, `Assigned exactly 2 questions (configured count)`);
  assert(dataAttemptY3.questions.every(q => q.year === 3), 'ALL assigned questions have year === 3');
  console.log(`Assigned questions: [${dataAttemptY3.questions.map(q => `${q.id} (Yr ${q.year})`).join(', ')}]`);

  // 8. Test Frozen Question Set (Refresh)
  console.log('\n--- 8. Testing Frozen Questions on Page Refresh ---');
  const refreshY2 = await fetch(`${BASE_URL}/api/exam/start-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testId: test2nd.id,
      studentId: stud2ndId
    })
  });
  const dataRefresh = await refreshY2.json();
  assert(dataRefresh.isExisting === true, 'isExisting === true (detected active attempt)');
  assert(
    dataRefresh.questions[0].id === dataAttemptY2.questions[0].id &&
    dataRefresh.questions[1].id === dataAttemptY2.questions[1].id,
    'Returned identical questions in identical frozen order upon reload'
  );

  // 9. Cross-Year Test Access Guard: 2nd Year student accessing 3rd Year Test
  console.log('\n--- 9. Cross-Year Test Access Guard (2nd Year -> 3rd Year Test) ---');
  const crossAccess = await fetch(`${BASE_URL}/api/exam/start-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testId: test3rd.id,
      studentId: stud2ndId
    })
  });
  const crossData = await crossAccess.json();
  assert(crossAccess.status === 403, `HTTP Status is 403 Forbidden`);
  assert(
    crossData.error === 'This assessment is not available for your academic year.',
    `Server rejected with exact error: "${crossData.error}"`
  );

  // 10. Cross-Year Test Access Guard: 3rd Year student accessing 2nd Year Test
  console.log('\n--- 10. Cross-Year Test Access Guard (3rd Year -> 2nd Year Test) ---');
  const crossAccess3 = await fetch(`${BASE_URL}/api/exam/start-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testId: test2nd.id,
      studentId: stud3rdId
    })
  });
  const crossData3 = await crossAccess3.json();
  assert(crossAccess3.status === 403, `HTTP Status is 403 Forbidden`);
  assert(
    crossData3.error === 'This assessment is not available for your academic year.',
    `Server rejected with exact error: "${crossData3.error}"`
  );

  // 11. Anti-cheating submission: 2nd Year student submitting 3rd Year question ID
  console.log('\n--- 11. Anti-Cheating: 2nd Year Candidate Submitting 3rd Year Question ---');
  const wrongYearQId = dataAttemptY3.questions[0].id; // 3rd year question
  const badSubmit = await fetch(`${BASE_URL}/api/code/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId: wrongYearQId,
      code: 'print("hacked")',
      attemptId: dataAttemptY2.attempt.id,
      studentId: stud2ndId,
      marks: 25
    })
  });
  const badSubmitData = await badSubmit.json();
  assert(badSubmit.status === 403, `Submission HTTP Status is 403 Forbidden`);
  assert(
    badSubmitData.error && badSubmitData.error.includes('academic year'),
    `Submission rejected with: "${badSubmitData.error}"`
  );

  console.log('\n================================================================');
  console.log(`  ALL ${passed} LIVE PRODUCTION TESTS PASSED WITH 100% SUCCESS! `);
  console.log('================================================================\n');
}

testLiveDeployment().catch(e => {
  console.error('Live Test Failed:', e);
  process.exit(1);
});
