const { createClient } = require('@libsql/client');

async function check() {
  const client = createClient({ url: 'file:jit_codearena_local.db' });
  const res = await client.execute(`
    SELECT UPPER(TRIM(register_number)) as reg, COUNT(*) as c
    FROM students
    GROUP BY UPPER(TRIM(register_number))
    HAVING COUNT(*) > 1
  `);
  console.log('Duplicate register numbers in local db:', res.rows);

  const all = await client.execute('SELECT id, register_number, full_name, status, is_archived FROM students');
  console.log('All local students count:', all.rows.length);
  for (const s of all.rows) {
    console.log(`[${s.id}] ${s.register_number} - ${s.full_name} | status: ${s.status} | is_archived: ${s.is_archived}`);
  }
}

check();
