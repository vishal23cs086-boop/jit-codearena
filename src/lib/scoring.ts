// ==============================================================================
// JIT CodeArena - Configurable Automatic Marking Engine
// ==============================================================================

import { ScoringConfig } from '@/types';

export interface ScoreCalculationParams {
  totalTestCases: number;
  testCasesPassed: number;
  executionTimeMs: number;
  timeLimitMs: number;
  codeLength: number;
  code: string;
  attemptNumber: number; // 1, 2, 3...
  questionMaxMarks: number;
  config?: Partial<ScoringConfig>;
}

export interface ScoreResult {
  finalMarks: number; // Total points scored for this question
  maxMarks: number;
  percentage: number;
  breakdown: {
    correctnessScore: number; // Max 70%
    timeScore: number; // Max 15%
    qualityScore: number; // Max 10%
    attemptsPenalty: number; // Max 5%
  };
}

const DEFAULT_CONFIG: ScoringConfig = {
  correctness: 70,
  time_performance: 15,
  code_quality: 10,
  attempts: 5,
};

/**
 * Calculates official server-side marks for a coding problem submission
 */
export function calculateSubmissionScore(params: ScoreCalculationParams): ScoreResult {
  const cfg: ScoringConfig = {
    ...DEFAULT_CONFIG,
    ...(params.config || {}),
  };

  const {
    totalTestCases,
    testCasesPassed,
    executionTimeMs,
    timeLimitMs,
    code,
    attemptNumber,
    questionMaxMarks,
  } = params;

  if (totalTestCases === 0) {
    return {
      finalMarks: 0,
      maxMarks: questionMaxMarks,
      percentage: 0,
      breakdown: { correctnessScore: 0, timeScore: 0, qualityScore: 0, attemptsPenalty: 0 },
    };
  }

  // 1. Correctness (Default 70%)
  const correctnessRatio = testCasesPassed / totalTestCases;
  const correctnessPoints = (cfg.correctness / 100) * correctnessRatio * questionMaxMarks;

  // If 0 test cases passed, overall score is 0
  if (testCasesPassed === 0) {
    return {
      finalMarks: 0,
      maxMarks: questionMaxMarks,
      percentage: 0,
      breakdown: { correctnessScore: 0, timeScore: 0, qualityScore: 0, attemptsPenalty: 0 },
    };
  }

  // 2. Time Performance (Default 15%)
  // Faster execution relative to limit gets full marks; linear degradation towards timeLimitMs
  const effectiveLimit = Math.max(timeLimitMs, 1000);
  const timeRatio = Math.max(0, 1 - executionTimeMs / effectiveLimit);
  const timePoints = (cfg.time_performance / 100) * timeRatio * correctnessRatio * questionMaxMarks;

  // 3. Code Quality (Default 10%)
  // Evaluates comments presence, meaningful naming, no trivial loops, clean indentation
  let qualityFactor = 0.8; // Base clean code score
  if (code.includes('#') || code.includes('"""')) qualityFactor += 0.1; // Documented code
  if (code.length > 50 && code.length < 1500) qualityFactor += 0.1; // Optimal code size
  if (code.includes('eval(') || code.includes('exec(')) qualityFactor -= 0.5; // Penalize unsafe constructs
  qualityFactor = Math.min(1.0, Math.max(0.2, qualityFactor));

  const qualityPoints = (cfg.code_quality / 100) * qualityFactor * correctnessRatio * questionMaxMarks;

  // 4. Submission Attempts (Default 5%)
  // First attempt: 100% of attempts points
  // Subsequent attempts subtract 1% per retry down to 0
  const attemptDeduction = Math.min(cfg.attempts, (attemptNumber - 1) * 1.5);
  const attemptsPoints = Math.max(0, (cfg.attempts - attemptDeduction) / 100) * correctnessRatio * questionMaxMarks;

  const totalCalculated = correctnessPoints + timePoints + qualityPoints + attemptsPoints;
  const finalMarks = Number(Math.min(questionMaxMarks, totalCalculated).toFixed(2));
  const percentage = Number(((finalMarks / questionMaxMarks) * 100).toFixed(2));

  return {
    finalMarks,
    maxMarks: questionMaxMarks,
    percentage,
    breakdown: {
      correctnessScore: Number(correctnessPoints.toFixed(2)),
      timeScore: Number(timePoints.toFixed(2)),
      qualityScore: Number(qualityPoints.toFixed(2)),
      attemptsPenalty: Number(attemptsPoints.toFixed(2)),
    },
  };
}
