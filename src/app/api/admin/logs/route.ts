import { NextRequest, NextResponse } from 'next/server';
import { getTursoClient, initTursoDb } from '@/lib/turso';

export async function GET(req: NextRequest) {
  try {
    await initTursoDb();
    const client = getTursoClient();

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 200;
    const testId = searchParams.get('testId');
    const studentId = searchParams.get('studentId');

    let sql = 'SELECT * FROM activity_logs';
    const conditions: string[] = [];
    const args: any[] = [];

    if (testId) {
      conditions.push('test_id = ?');
      args.push(testId);
    }
    if (studentId) {
      conditions.push('(student_id = ? OR register_number = ?)');
      args.push(studentId, studentId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    args.push(limit);

    const res = await client.execute({ sql, args });

    const logs = res.rows.map((row: any) => ({
      id: String(row.id),
      test_id: row.test_id ? String(row.test_id) : null,
      student_id: String(row.student_id),
      student_name: row.student_name ? String(row.student_name) : null,
      register_number: row.register_number ? String(row.register_number) : null,
      event_type: String(row.event_type),
      description: String(row.description),
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {},
      timestamp: String(row.timestamp),
    }));

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    console.error('Fetch activity logs error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
