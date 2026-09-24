const { createClient } = require('@libsql/client');

async function purge() {
  const client = createClient({ url: 'file:jit_codearena_local.db' });
  console.log('Connecting to local database file:jit_codearena_local.db...');

  const beforeStudents = await client.execute('SELECT COUNT(*) as count FROM students');
  const beforeAttempts = await client.execute('SELECT COUNT(*) as count FROM test_attempts');
  const beforeSubmissions = await client.execute('SELECT COUNT(*) as count FROM submissions');

  console.log('Before purge:');
  console.log(`- Students: ${beforeStudents.rows[0].count}`);
  console.log(`- Test Attempts: ${beforeAttempts.rows[0].count}`);
  console.log(`- Submissions: ${beforeSubmissions.rows[0].count}`);

  await client.execute('DELETE FROM student_presence');
  await client.execute('DELETE FROM attempt_questions');
  await client.execute('DELETE FROM submissions');
  await client.execute('DELETE FROM test_attempts');
  await client.execute('DELETE FROM activity_logs');
  await client.execute("DELETE FROM login_activity WHERE user_role = 'student' OR user_id LIKE 'std-%' OR user_id LIKE 'usr-%'");
  await client.execute('DELETE FROM students');

  const afterStudents = await client.execute('SELECT COUNT(*) as count FROM students');
  const afterAttempts = await client.execute('SELECT COUNT(*) as count FROM test_attempts');
  const afterSubmissions = await client.execute('SELECT COUNT(*) as count FROM submissions');

  console.log('\nAfter purge:');
  console.log(`- Students: ${afterStudents.rows[0].count}`);
  console.log(`- Test Attempts: ${afterAttempts.rows[0].count}`);
  console.log(`- Submissions: ${afterSubmissions.rows[0].count}`);
  console.log('✅ Local database completely purged of all student data!');
}

purge().catch(console.error);
