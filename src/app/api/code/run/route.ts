import { NextRequest, NextResponse } from 'next/server';
import { executeJudge0 } from '@/lib/judge0/client';

export async function POST(req: NextRequest) {
  try {
    const { code, input, timeLimitMs } = await req.json();

    if (typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const timeLimitSec = (timeLimitMs || 2000) / 1000;
    const result = await executeJudge0(code, input || '', timeLimitSec);

    return NextResponse.json({
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compile_output,
      status: result.status.description,
      timeMs: Math.round(parseFloat(result.time || '0.05') * 1000),
      memoryKb: result.memory || 3400,
    });
  } catch (error) {
    console.error('Run code error:', error);
    return NextResponse.json(
      { error: 'Failed to execute code' },
      { status: 500 }
    );
  }
}
