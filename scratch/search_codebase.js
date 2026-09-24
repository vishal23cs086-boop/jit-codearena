const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern, label) {
  const results = [];
  function recurse(currentDir) {
    const entries = fs.readdirSync(currentDir);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        recurse(fullPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (pattern.test(content)) {
          results.push(fullPath);
        }
      }
    }
  }
  recurse(dir);
  console.log(`\n=== Pattern: ${label} (${results.length} matches) ===`);
  results.forEach(r => console.log('  ' + r));
}

searchDir('.', /student-login/i, 'student-login');
searchDir('.', /findStudentByRegNo/i, 'findStudentByRegNo');
searchDir('.', /login_activity/i, 'login_activity');
searchDir('.', /supabase/i, 'supabase');
searchDir('.', /student_presence/i, 'student_presence');
searchDir('.', /test_attempts/i, 'test_attempts');
searchDir('.', /DELETE FROM students/i, 'DELETE FROM students');
searchDir('.', /session_version/i, 'session_version');
