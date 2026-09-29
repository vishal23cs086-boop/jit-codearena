import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { getTursoClient, initTursoDb } from '@/lib/turso';
import studentsMasterData from '@/data/students-master.json';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate Administrator
    const adminCookie = req.cookies.get('jit_admin_session')?.value;
    if (!adminCookie) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }
    const session = await verifySessionToken(adminCookie);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Administrator privileges required.' },
        { status: 403 }
      );
    }

    // 2. Initialize database connection
    await initTursoDb();
    const client = getTursoClient();

    // 3. Authoritative Database Queries for Core Counts
    const activeCondition = "(account_deleted = 0 OR account_deleted IS NULL) AND (is_archived = 0 OR is_archived IS NULL) AND (status != 'archived' OR status IS NULL)";

    const [
      totalRes,
      year2Res,
      year3Res,
      cseRes,
      csbsRes,
      aidsRes,
      otherDeptsRes,
      otherYearsRes,
      dupRes,
      allStudentsRes,
    ] = await Promise.all([
      client.execute(`SELECT COUNT(*) as c FROM students WHERE ${activeCondition}`),
      client.execute(`SELECT COUNT(*) as c FROM students WHERE year = 2 AND ${activeCondition}`),
      client.execute(`SELECT COUNT(*) as c FROM students WHERE year = 3 AND ${activeCondition}`),
      client.execute(`SELECT COUNT(*) as c FROM students WHERE UPPER(TRIM(department)) = 'CSE' AND ${activeCondition}`),
      client.execute(`SELECT COUNT(*) as c FROM students WHERE UPPER(TRIM(department)) = 'CSBS' AND ${activeCondition}`),
      client.execute(`SELECT COUNT(*) as c FROM students WHERE (UPPER(TRIM(department)) = 'AI&DS' OR UPPER(TRIM(department)) = 'AIDS') AND ${activeCondition}`),
      client.execute(`SELECT COUNT(*) as c FROM students WHERE UPPER(TRIM(department)) NOT IN ('CSE', 'CSBS', 'AI&DS', 'AIDS') AND ${activeCondition}`),
      client.execute(`SELECT COUNT(*) as c FROM students WHERE year NOT IN (2, 3) AND ${activeCondition}`),
      client.execute(`SELECT UPPER(TRIM(register_number)) as reg_no, COUNT(*) as cnt FROM students WHERE ${activeCondition} GROUP BY UPPER(TRIM(register_number)) HAVING COUNT(*) > 1`),
      client.execute(`SELECT id, register_number, full_name, department, year, email, phone, academic_year, status FROM students WHERE ${activeCondition} ORDER BY register_number ASC`),
    ]);

    const totalStudents = Number(totalRes.rows[0]?.c || 0);
    const year2 = Number(year2Res.rows[0]?.c || 0);
    const year3 = Number(year3Res.rows[0]?.c || 0);
    const cse = Number(cseRes.rows[0]?.c || 0);
    const csbs = Number(csbsRes.rows[0]?.c || 0);
    const aids = Number(aidsRes.rows[0]?.c || 0);
    const otherDeptsCount = Number(otherDeptsRes.rows[0]?.c || 0);
    const otherYearsCount = Number(otherYearsRes.rows[0]?.c || 0);

    // 4. Data Validation: YEAR 2 + YEAR 3 === TOTAL STUDENTS
    const yearSum = year2 + year3;
    const yearMismatch = yearSum !== totalStudents;
    const mismatchDetails = yearMismatch
      ? {
          total: totalStudents,
          year2,
          year3,
          difference: totalStudents - yearSum,
        }
      : null;

    // 5. Data Integrity: Duplicates, Invalid, and Extra Record Detection
    const duplicateRolls = dupRes.rows.map((r: any) => ({
      rollNumber: String(r.reg_no),
      count: Number(r.cnt),
    }));

    // Identify official 516 master roster roll numbers (first 516 from master Excel)
    // Note: The official 516 students don't contain 23CS080, 23CS084, 25CS058.
    const officialRollSet = new Set(
      studentsMasterData
        .filter((s: any) => !['23CS080', '23CS084', '25CS058'].includes(s.register_number.toUpperCase().trim()))
        .map((s: any) => s.register_number.toUpperCase().trim())
    );

    const extraRecords: Array<{
      id: string;
      register_number: string;
      full_name: string;
      department: string;
      year: number;
      email?: string;
      phone?: string;
      reason: string;
    }> = [];

    const invalidRecords: Array<{
      id: string;
      register_number: string;
      full_name: string;
      department: string;
      year: number;
      reason: string;
    }> = [];

    const uniqueRollsSet = new Set<string>();

    for (const row of allStudentsRes.rows) {
      const reg = String(row.register_number || '').trim().toUpperCase();
      uniqueRollsSet.add(reg);

      const dept = String(row.department || '').trim().toUpperCase();
      const yr = Number(row.year);

      // Check for invalid dept or year
      if (!['CSE', 'CSBS', 'AI&DS', 'AIDS'].includes(dept) || ![2, 3].includes(yr)) {
        invalidRecords.push({
          id: String(row.id),
          register_number: reg,
          full_name: String(row.full_name),
          department: String(row.department),
          year: yr,
          reason: ![2, 3].includes(yr)
            ? `Invalid year: ${yr} (Only Year 2 and Year 3 valid)`
            : `Unrecognized department: ${dept}`,
        });
      }

      // Identify extra / non-roster records without auto-deleting them
      if (!officialRollSet.has(reg)) {
        extraRecords.push({
          id: String(row.id),
          register_number: reg,
          full_name: String(row.full_name),
          department: String(row.department),
          year: yr,
          email: row.email ? String(row.email) : undefined,
          phone: row.phone ? String(row.phone) : undefined,
          reason: 'Manual or legacy entry (not in the official 516 master Excel roster)',
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        totalStudents,
        year2,
        year3,
        cse,
        csbs,
        aids,
        otherDepartments: otherDeptsCount,
        otherYears: otherYearsCount,
      },
      validation: {
        isValid: !yearMismatch && duplicateRolls.length === 0 && invalidRecords.length === 0,
        mismatchDetected: yearMismatch,
        mismatchDetails,
      },
      dataIntegrity: {
        totalRecords: totalStudents,
        uniqueRollNumbers: uniqueRollsSet.size,
        duplicateRecordsCount: duplicateRolls.length,
        invalidRecordsCount: invalidRecords.length,
        extraRecordsCount: extraRecords.length,
        duplicates: duplicateRolls,
        invalidRecords,
        extraRecords,
      },
    });
  } catch (error: any) {
    console.error('Fetch student statistics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unable to load live student statistics from database.',
      },
      { status: 500 }
    );
  }
}
