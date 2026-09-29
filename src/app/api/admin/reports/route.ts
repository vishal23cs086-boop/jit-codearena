import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient, initTursoDb } from '@/lib/turso';
import { MAX_PROCTORING_VIOLATIONS } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    await initTursoDb();
    const client = getTursoClient();

    const searchParams = req.nextUrl.searchParams;
    const yearParam = searchParams.get('year') || 'all';
    const deptParam = searchParams.get('department') || 'all';
    const assessmentParam = searchParams.get('assessment') || 'all';
    const statusParam = searchParams.get('status') || 'all';
    const searchParam = (searchParams.get('search') || '').trim().toLowerCase();

    const activeCondition =
      "(s.account_deleted = 0 OR s.account_deleted IS NULL) AND (s.is_archived = 0 OR s.is_archived IS NULL) AND (s.status != 'archived' OR s.status IS NULL)";

    // 1. Available Tests
    const testsRes = await client.execute(`
      SELECT id, title, year, duration, total_marks, passing_marks, status 
      FROM tests 
      WHERE (is_archived = 0 OR is_archived IS NULL)
      ORDER BY year ASC, title ASC
    `);

    const tests = testsRes.rows.map((t: any) => ({
      id: String(t.id),
      title: String(t.title),
      year: Number(t.year || 2),
      duration: Number(t.duration || 60),
      total_marks: Number(t.total_marks || 100),
      passing_marks: Number(t.passing_marks || 40),
      status: String(t.status || 'active'),
    }));

    // 2. Authoritative Year + Department Matrix
    const matrixRes = await client.execute(`
      SELECT 
        s.year,
        CASE 
          WHEN UPPER(TRIM(s.department)) IN ('AI&DS', 'AIDS') THEN 'AI&DS'
          ELSE UPPER(TRIM(s.department))
        END as dept,
        COUNT(*) as count
      FROM students s
      WHERE ${activeCondition}
      GROUP BY s.year, dept
      ORDER BY s.year, dept
    `);

    const matrix = {
      year2: { cse: 0, csbs: 0, aids: 0, total: 0 },
      year3: { cse: 0, csbs: 0, aids: 0, total: 0 },
      total: { cse: 0, csbs: 0, aids: 0, total: 0 },
    };

    for (const r of matrixRes.rows) {
      const yr = Number(r.year);
      const dept = String(r.dept);
      const cnt = Number(r.count || 0);

      if (yr === 2) {
        if (dept === 'CSE') matrix.year2.cse = cnt;
        else if (dept === 'CSBS') matrix.year2.csbs = cnt;
        else if (dept === 'AI&DS') matrix.year2.aids = cnt;
        matrix.year2.total += cnt;
      } else if (yr === 3) {
        if (dept === 'CSE') matrix.year3.cse = cnt;
        else if (dept === 'CSBS') matrix.year3.csbs = cnt;
        else if (dept === 'AI&DS') matrix.year3.aids = cnt;
        matrix.year3.total += cnt;
      }
    }

    matrix.total.cse = matrix.year2.cse + matrix.year3.cse;
    matrix.total.csbs = matrix.year2.csbs + matrix.year3.csbs;
    matrix.total.aids = matrix.year2.aids + matrix.year3.aids;
    matrix.total.total = matrix.year2.total + matrix.year3.total;

    // 3. Query All Active Students with Assessment Attempts
    let studentsSql = '';
    const sqlArgs: any[] = [];

    if (assessmentParam !== 'all') {
      studentsSql = `
        SELECT 
          s.id as student_id,
          s.register_number,
          s.full_name,
          CASE 
            WHEN UPPER(TRIM(s.department)) IN ('AI&DS', 'AIDS') THEN 'AI&DS'
            ELSE UPPER(TRIM(s.department))
          END as department,
          s.year,
          s.section,
          s.email,
          s.phone,
          ta.id as attempt_id,
          ta.test_id,
          ta.score,
          ta.max_score,
          ta.percentage,
          ta.start_time,
          ta.end_time,
          ta.status as attempt_status,
          ta.tab_switches,
          ta.fullscreen_exits,
          ta.violation_count,
          ta.time_taken_seconds,
          ta.completion_rank,
          ta.question_results,
          t.title as test_title,
          t.total_marks as test_total_marks,
          t.duration as test_duration
        FROM students s
        LEFT JOIN test_attempts ta ON ta.student_id = s.id AND ta.test_id = ?
        LEFT JOIN tests t ON t.id = ?
        WHERE ${activeCondition}
        ORDER BY s.register_number ASC
      `;
      sqlArgs.push(assessmentParam, assessmentParam);
    } else {
      studentsSql = `
        SELECT 
          s.id as student_id,
          s.register_number,
          s.full_name,
          CASE 
            WHEN UPPER(TRIM(s.department)) IN ('AI&DS', 'AIDS') THEN 'AI&DS'
            ELSE UPPER(TRIM(s.department))
          END as department,
          s.year,
          s.section,
          s.email,
          s.phone,
          ta.id as attempt_id,
          ta.test_id,
          ta.score,
          ta.max_score,
          ta.percentage,
          ta.start_time,
          ta.end_time,
          ta.status as attempt_status,
          ta.tab_switches,
          ta.fullscreen_exits,
          ta.violation_count,
          ta.time_taken_seconds,
          ta.completion_rank,
          ta.question_results,
          t.title as test_title,
          t.total_marks as test_total_marks,
          t.duration as test_duration
        FROM students s
        LEFT JOIN (
          SELECT ta.* FROM test_attempts ta
          INNER JOIN (
            SELECT student_id, MAX(created_at) as max_c
            FROM test_attempts
            GROUP BY student_id
          ) l ON ta.student_id = l.student_id AND ta.created_at = l.max_c
        ) ta ON ta.student_id = s.id
        LEFT JOIN tests t ON ta.test_id = t.id
        WHERE ${activeCondition}
        ORDER BY s.register_number ASC
      `;
    }

    const studentsRes = await client.execute({ sql: studentsSql, args: sqlArgs });

    // 4. Map & Normalize All Student Report Rows
    const allRows = studentsRes.rows.map((r: any) => {
      const year = Number(r.year || 2);
      const dept = String(r.department || 'CSE');
      const hasAttempt = Boolean(r.attempt_id);

      // Determine standardized assessment title
      let assessmentTitle = r.test_title ? String(r.test_title) : '';
      if (!assessmentTitle) {
        if (assessmentParam !== 'all') {
          const matchTest = tests.find((t) => t.id === assessmentParam);
          assessmentTitle = matchTest ? matchTest.title : 'Assessment';
        } else {
          assessmentTitle = year === 3 ? 'JIT 3rd Year Advanced Python Assessment' : 'JIT 2nd Year Python Assessment';
        }
      }

      // Determine standardized total marks
      const totalMarks = Number(r.max_score || r.test_total_marks || (year === 3 ? 50 : 50));

      // Calculate time taken
      let timeTakenSeconds = Number(r.time_taken_seconds || 0);
      if (timeTakenSeconds <= 0 && r.start_time && r.end_time) {
        timeTakenSeconds = Math.max(1, Math.floor((new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 1000));
      }

      const mins = Math.floor(timeTakenSeconds / 60);
      const secs = timeTakenSeconds % 60;
      const timeTakenFormatted = hasAttempt ? `${mins}m ${secs}s` : '—';

      // Violations
      const tabSwitches = Number(r.tab_switches || 0);
      const fullscreenExits = Number(r.fullscreen_exits || 0);
      // violation_count = warnings issued (authoritative); raw tab/fullscreen counts only for old rows without it
      const violationCount = Number(r.violation_count ?? (tabSwitches + fullscreenExits));

      // Status resolution
      let status: 'COMPLETED' | 'IN PROGRESS' | 'NOT STARTED' | 'TERMINATED' = 'NOT STARTED';
      if (!hasAttempt) {
        status = 'NOT STARTED';
      } else {
        const rawStatus = String(r.attempt_status || '').toLowerCase();
        if (rawStatus === 'in_progress') {
          status = 'IN PROGRESS';
        } else if (rawStatus === 'terminated' || (rawStatus === 'auto_submitted' && violationCount >= MAX_PROCTORING_VIOLATIONS)) {
          status = 'TERMINATED';
        } else if (rawStatus === 'completed' || rawStatus === 'submitted' || rawStatus === 'auto_submitted') {
          status = violationCount >= MAX_PROCTORING_VIOLATIONS ? 'TERMINATED' : 'COMPLETED';
        } else {
          status = 'IN PROGRESS';
        }
      }

      // Score and percentage
      const score = hasAttempt && r.score !== null && r.score !== undefined ? Number(r.score) : null;
      let percentage: number | null = null;
      if (score !== null && totalMarks > 0) {
        percentage = r.percentage !== null && r.percentage !== undefined && Number(r.percentage) > 0
          ? Number(r.percentage)
          : Math.round((score / totalMarks) * 100);
      }

      // Completion Time
      let completionTime = 'Not Started';
      if (status === 'COMPLETED' || status === 'TERMINATED') {
        completionTime = r.end_time ? new Date(r.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Submitted';
      } else if (status === 'IN PROGRESS') {
        completionTime = 'In Progress';
      }

      return {
        id: String(r.attempt_id || `std-row-${r.student_id}`),
        student_id: String(r.student_id),
        attempt_id: r.attempt_id ? String(r.attempt_id) : null,
        register_number: String(r.register_number || '').trim().toUpperCase(),
        name: String(r.full_name || 'Candidate').trim(),
        department: dept,
        year,
        section: String(r.section || 'A'),
        email: r.email ? String(r.email) : '',
        phone: r.phone ? String(r.phone) : '',
        assessment: assessmentTitle,
        test_id: r.test_id ? String(r.test_id) : null,
        score,
        total_marks: totalMarks,
        percentage,
        time_taken_seconds: timeTakenSeconds,
        time_taken_formatted: timeTakenFormatted,
        violations: violationCount,
        tab_switches: tabSwitches,
        fullscreen_exits: fullscreenExits,
        status,
        started_at: r.start_time ? String(r.start_time) : null,
        completed_at: r.end_time ? String(r.end_time) : null,
        completion_time: completionTime,
        rank: null as number | null | string,
        question_results: r.question_results || null,
      };
    });

    // 5. Department Summaries (CSE, CSBS, AI&DS)
    const computeDeptSummary = (deptName: string) => {
      const deptRows = allRows.filter((r) => r.department === deptName);
      const totalStudents = deptRows.length;
      const year2Students = deptRows.filter((r) => r.year === 2).length;
      const year3Students = deptRows.filter((r) => r.year === 3).length;
      const completedRows = deptRows.filter((r) => r.status === 'COMPLETED');
      const inProgressRows = deptRows.filter((r) => r.status === 'IN PROGRESS');
      const notStartedRows = deptRows.filter((r) => r.status === 'NOT STARTED');
      const terminatedRows = deptRows.filter((r) => r.status === 'TERMINATED');

      const completedCount = completedRows.length;
      const totalScore = completedRows.reduce((sum, r) => sum + (r.score || 0), 0);
      const totalPct = completedRows.reduce((sum, r) => sum + (r.percentage || 0), 0);
      const totalViolations = deptRows.reduce((sum, r) => sum + r.violations, 0);

      const averageScore = completedCount > 0 ? Math.round((totalScore / completedCount) * 10) / 10 : 0;
      const averagePercentage = completedCount > 0 ? Math.round((totalPct / completedCount) * 10) / 10 : 0;

      return {
        department: deptName,
        totalStudents,
        year2Students,
        year3Students,
        completed: completedCount,
        notStarted: notStartedRows.length,
        inProgress: inProgressRows.length,
        terminated: terminatedRows.length,
        averageScore,
        averagePercentage,
        totalViolations,
      };
    };

    const departmentSummaries = {
      CSE: computeDeptSummary('CSE'),
      CSBS: computeDeptSummary('CSBS'),
      'AI&DS': computeDeptSummary('AI&DS'),
    };

    // 6. Year Summaries (Year 2, Year 3)
    const computeYearSummary = (yr: number) => {
      const yearRows = allRows.filter((r) => r.year === yr);
      const totalStudents = yearRows.length;
      const cseCount = yearRows.filter((r) => r.department === 'CSE').length;
      const csbsCount = yearRows.filter((r) => r.department === 'CSBS').length;
      const aidsCount = yearRows.filter((r) => r.department === 'AI&DS').length;

      const completedRows = yearRows.filter((r) => r.status === 'COMPLETED');
      const notStartedRows = yearRows.filter((r) => r.status === 'NOT STARTED');
      const inProgressRows = yearRows.filter((r) => r.status === 'IN PROGRESS');
      const terminatedRows = yearRows.filter((r) => r.status === 'TERMINATED');

      const completedCount = completedRows.length;
      const totalScore = completedRows.reduce((sum, r) => sum + (r.score || 0), 0);
      const totalPct = completedRows.reduce((sum, r) => sum + (r.percentage || 0), 0);
      const totalViolations = yearRows.reduce((sum, r) => sum + r.violations, 0);

      const averageScore = completedCount > 0 ? Math.round((totalScore / completedCount) * 10) / 10 : 0;
      const averagePercentage = completedCount > 0 ? Math.round((totalPct / completedCount) * 10) / 10 : 0;

      return {
        year: yr,
        totalStudents,
        cse: cseCount,
        csbs: csbsCount,
        aids: aidsCount,
        completed: completedCount,
        notStarted: notStartedRows.length,
        inProgress: inProgressRows.length,
        terminated: terminatedRows.length,
        averageScore,
        averagePercentage,
        totalViolations,
      };
    };

    const yearSummaries = {
      year2: computeYearSummary(2),
      year3: computeYearSummary(3),
    };

    // 7. Filter All Rows by Active Parameters
    let filteredRows = allRows.filter((r) => {
      // Year filter
      if (yearParam !== 'all' && r.year !== Number(yearParam)) {
        return false;
      }
      // Department filter
      if (deptParam !== 'all' && r.department !== deptParam) {
        return false;
      }
      // Status filter
      if (statusParam !== 'all') {
        const targetStatus = statusParam.toUpperCase().replace('_', ' ');
        if (r.status !== targetStatus) {
          return false;
        }
      }
      // Search filter
      if (searchParam) {
        const matchesReg = r.register_number.toLowerCase().includes(searchParam);
        const matchesName = r.name.toLowerCase().includes(searchParam);
        if (!matchesReg && !matchesName) {
          return false;
        }
      }
      return true;
    });

    // 8. Compute Dynamic Ranking within the Filtered Group (Requirement 13)
    // Completed students ranked by highest score descending, then lowest time taken ascending.
    // Students with proctoring violations are not ranked; they are listed separately.
    const completedStudents = filteredRows.filter((r) => r.status === 'COMPLETED' && r.violations === 0);
    completedStudents.sort((a, b) => {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return a.time_taken_seconds - b.time_taken_seconds;
    });

    const rankMap = new Map<string, number>();
    completedStudents.forEach((student, idx) => {
      rankMap.set(student.student_id, idx + 1);
    });

    filteredRows = filteredRows.map((r) => ({
      ...r,
      rank: r.status === 'COMPLETED' ? rankMap.get(r.student_id) || '—' : '—',
    }));

    // Sort report rows: completed students by rank, then in progress, then not started, then terminated
    filteredRows.sort((a, b) => {
      const statusOrder = { COMPLETED: 1, 'IN PROGRESS': 2, 'NOT STARTED': 3, TERMINATED: 4 };
      const orderA = statusOrder[a.status] || 5;
      const orderB = statusOrder[b.status] || 5;
      if (orderA !== orderB) return orderA - orderB;

      if (a.status === 'COMPLETED' && b.status === 'COMPLETED') {
        const rankA = typeof a.rank === 'number' ? a.rank : 999999;
        const rankB = typeof b.rank === 'number' ? b.rank : 999999;
        return rankA - rankB;
      }

      return a.register_number.localeCompare(b.register_number);
    });

    // 9. Report Summary for Active Filtered Group (Requirement 3 & 11)
    const totalFilteredStudents = filteredRows.length;
    const completedFiltered = filteredRows.filter((r) => r.status === 'COMPLETED');
    const inProgressFiltered = filteredRows.filter((r) => r.status === 'IN PROGRESS');
    const notStartedFiltered = filteredRows.filter((r) => r.status === 'NOT STARTED');
    const terminatedFiltered = filteredRows.filter((r) => r.status === 'TERMINATED');

    const completedFilteredCount = completedFiltered.length;
    const totalFilteredScore = completedFiltered.reduce((sum, r) => sum + (r.score || 0), 0);
    const totalFilteredPct = completedFiltered.reduce((sum, r) => sum + (r.percentage || 0), 0);
    const totalFilteredViolations = filteredRows.reduce((sum, r) => sum + r.violations, 0);

    const averageFilteredScore =
      completedFilteredCount > 0 ? Math.round((totalFilteredScore / completedFilteredCount) * 10) / 10 : 0;
    const averageFilteredPercentage =
      completedFilteredCount > 0 ? Math.round((totalFilteredPct / completedFilteredCount) * 10) / 10 : 0;

    let highestScore = 0;
    let lowestScore = 0;
    let avgTimeSeconds = 0;

    if (completedFilteredCount > 0) {
      highestScore = Math.max(...completedFiltered.map((r) => r.score || 0));
      lowestScore = Math.min(...completedFiltered.map((r) => r.score || 0));
      const totalTime = completedFiltered.reduce((sum, r) => sum + r.time_taken_seconds, 0);
      avgTimeSeconds = Math.round(totalTime / completedFilteredCount);
    }

    const avgMins = Math.floor(avgTimeSeconds / 60);
    const avgSecs = avgTimeSeconds % 60;
    const averageCompletionTime = completedFilteredCount > 0 ? `${avgMins}m ${avgSecs}s` : '—';

    const summary = {
      totalStudents: totalFilteredStudents,
      completed: completedFilteredCount,
      inProgress: inProgressFiltered.length,
      notStarted: notStartedFiltered.length,
      terminated: terminatedFiltered.length,
      averageScore: averageFilteredScore,
      averagePercentage: averageFilteredPercentage,
      totalViolations: totalFilteredViolations,
      highestScore,
      lowestScore,
      averageCompletionTime,
    };

    // 10. Security Audit Incidents (Respecting current filters) (Requirement 10)
    const auditIncidentsSql = `
      SELECT 
        al.id,
        al.student_id,
        COALESCE(s.register_number, al.register_number, 'N/A') as register_number,
        COALESCE(s.full_name, al.student_name, 'Candidate') as full_name,
        COALESCE(
          CASE 
            WHEN UPPER(TRIM(s.department)) IN ('AI&DS', 'AIDS') THEN 'AI&DS'
            ELSE UPPER(TRIM(s.department))
          END,
          'CSE'
        ) as department,
        COALESCE(s.year, 2) as year,
        COALESCE(t.title, al.test_id, 'Python Assessment') as test_title,
        al.event_type,
        al.description,
        al.metadata,
        al.timestamp
      FROM activity_logs al
      LEFT JOIN students s ON (al.student_id = s.id OR UPPER(TRIM(al.register_number)) = UPPER(TRIM(s.register_number)))
      LEFT JOIN tests t ON al.test_id = t.id
      WHERE (
        al.event_type IN ('TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY', 'PASTE', 'CUT', 'WINDOW_BLUR', 'WARNING_TRIGGERED', 'DEVTOOLS_OPEN', 'RIGHT_CLICK')
        OR al.event_type LIKE '%VIOLATION%'
        OR al.event_type LIKE '%TAB%'
        OR al.event_type LIKE '%FULLSCREEN%'
      )
      ORDER BY al.timestamp DESC
      LIMIT 500
    `;

    const auditRes = await client.execute(auditIncidentsSql);

    // Format incidents and filter by active parameters
    let securityIncidents = auditRes.rows.map((r: any) => {
      const yr = Number(r.year || 2);
      const dept = String(r.department || 'CSE');
      const eventType = String(r.event_type || 'PROCTORING_FLAG').toUpperCase();

      let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
      let actionTaken = 'Official Invigilation Warning Issued';

      if (eventType.includes('TERMINAT') || eventType.includes('DEVTOOLS')) {
        severity = 'CRITICAL';
        actionTaken = 'Referred to Disciplinary Committee & Session Terminated';
      } else if (eventType.includes('COPY') || eventType.includes('PASTE') || eventType.includes('FULLSCREEN')) {
        severity = 'HIGH';
        actionTaken = 'Security Violation Logged & Flagged';
      }

      return {
        id: String(r.id),
        roll_number: String(r.register_number || '').trim().toUpperCase(),
        name: String(r.full_name || 'Candidate').trim(),
        department: dept,
        year: yr,
        assessment: String(r.test_title || 'Assessment'),
        violation_type: eventType.replace(/_/g, ' '),
        violation_count: 1,
        timestamp: r.timestamp ? new Date(r.timestamp).toLocaleString() : 'N/A',
        severity,
        action_taken: actionTaken,
      };
    });

    // Also include any violations from filtered students' attempts
    for (const r of filteredRows) {
      if (r.violations > 0 && securityIncidents.every((inc) => inc.roll_number !== r.register_number)) {
        securityIncidents.push({
          id: `att-inc-${r.id}`,
          roll_number: r.register_number,
          name: r.name,
          department: r.department,
          year: r.year,
          assessment: r.assessment,
          violation_type: r.tab_switches > 0 ? 'TAB SWITCH DEVIATION' : 'FULLSCREEN EXIT ATTEMPT',
          violation_count: r.violations,
          timestamp: r.completed_at ? new Date(r.completed_at).toLocaleString() : 'During Examination',
          severity: r.violations >= MAX_PROCTORING_VIOLATIONS ? 'CRITICAL' : r.violations > 1 ? 'HIGH' : 'MEDIUM',
          action_taken: r.violations >= MAX_PROCTORING_VIOLATIONS ? 'Referred to Disciplinary Committee' : 'Proctoring Warning Issued',
        });
      }
    }

    // Filter security incidents by current year & department
    securityIncidents = securityIncidents.filter((inc) => {
      if (yearParam !== 'all' && inc.year !== Number(yearParam)) return false;
      if (deptParam !== 'all' && inc.department !== deptParam) return false;
      return true;
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      filtersApplied: {
        year: yearParam,
        department: deptParam,
        assessment: assessmentParam,
        status: statusParam,
        search: searchParam,
      },
      tests,
      matrix,
      departmentSummaries,
      yearSummaries,
      summary,
      rows: filteredRows,
      securityIncidents,
      count: filteredRows.length,
    });
  } catch (error: any) {
    console.error('Fetch reports error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unable to load live report data from database.',
      },
      { status: 500 }
    );
  }
}
