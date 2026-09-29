import { extractText } from 'unpdf';

export interface ParsedQuestionItem {
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string | null;
  marks: number;
  academic_year: number;
  source_page: number;
  status: 'VALID' | 'NEEDS_REVIEW' | 'DUPLICATE' | 'APPROVED' | 'REJECTED';
  review_notes?: string | null;
  is_duplicate?: number;
  duplicate_of_id?: string | null;
}

export interface ParsedPdfResult {
  success: boolean;
  filename: string;
  academic_year: number;
  total_pages: number;
  questions_extracted: number;
  answers_extracted: number;
  valid_questions: number;
  invalid_questions: number;
  status: 'PROCESSING' | 'REVIEW_REQUIRED' | 'READY' | 'IMPORTED' | 'FAILED';
  error_message?: string | null;
  questions: ParsedQuestionItem[];
  answer_key: Record<number, string>;
  is_scanned_pdf: boolean;
}

/**
 * Validates a PDF file buffer for size, header, and basic integrity.
 */
export function validatePdfBuffer(buffer: Buffer | Uint8Array, filename: string): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty file uploaded. Please upload a valid PDF document.' };
  }

  // Maximum 15MB file size limit
  const MAX_SIZE_BYTES = 15 * 1024 * 1024;
  if (buffer.length > MAX_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds 15MB limit. Please upload a smaller question paper.' };
  }

  // Check PDF header "%PDF-"
  const header = Buffer.from(buffer.slice(0, 5)).toString('ascii');
  if (header !== '%PDF-') {
    return { valid: false, error: 'Invalid file format. The uploaded file is not a valid PDF document.' };
  }

  return { valid: true };
}

/**
 * Extracts answer key entries from the designated answer key text.
 * Supports patterns:
 * - 1 - B
 * - 1. B
 * - 1) B
 * - 1: B
 * - Q1 - B
 * - Q.1: (B)
 * - 1 B
 * - Multi-column tabular keys (e.g. "1 - A    11 - B    21 - C")
 */
export function parseAnswerKeyFromText(text: string): Map<number, string> {
  const answerMap = new Map<number, string>();
  if (!text || typeof text !== 'string') return answerMap;

  // Regex pattern matching:
  // (Optional "Q" or "Question") (Number) (Separator: - / : / . / ) / space) (Optional bracket) (Answer: A, B, C, D)
  const pattern = /(?:(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*(?:[-–—:.)]|\s+)\s*\(?([A-Da-d])\)?)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const qNum = parseInt(match[1], 10);
    const ansLetter = match[2].toUpperCase();
    if (qNum > 0 && !answerMap.has(qNum)) {
      answerMap.set(qNum, ansLetter);
    }
  }

  // Secondary fallback for strict tabular format: e.g. "1 A", "2 B"
  if (answerMap.size === 0) {
    const tablePattern = /\b(\d{1,3})\s+([A-Da-d])\b/g;
    while ((match = tablePattern.exec(text)) !== null) {
      const qNum = parseInt(match[1], 10);
      const ansLetter = match[2].toUpperCase();
      if (qNum > 0 && !answerMap.has(qNum)) {
        answerMap.set(qNum, ansLetter);
      }
    }
  }

  return answerMap;
}

/**
 * Parses individual questions and options (A, B, C, D) from page texts.
 */
export function parseQuestionsFromPageTexts(
  pagesText: string[],
  year: number
): Array<{
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  source_page: number;
}> {
  const extractedQuestions: Array<{
    question_number: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    source_page: number;
  }> = [];

  // Track page offsets to accurately map question numbers to source pages
  let combinedText = '';
  const pageIndexRanges: Array<{ pageNumber: number; startIndex: number; endIndex: number }> = [];

  for (let p = 0; p < pagesText.length; p++) {
    const startIdx = combinedText.length;
    combinedText += (p > 0 ? '\n\n' : '') + pagesText[p];
    pageIndexRanges.push({
      pageNumber: p + 1,
      startIndex: startIdx,
      endIndex: combinedText.length,
    });
  }

  // Question regex: matches "1. ", "1) ", "Q1. ", "Question 1: " at line start or after newline
  const qAnchorRegex = /(?:^|\n)\s*(?:(?:Question|Q\.?)\s*)?(\d{1,3})\s*[\.\)\:\-]\s+/gi;
  const questionAnchors: Array<{ qNum: number; index: number; matchLen: number }> = [];

  let qMatch: RegExpExecArray | null;
  while ((qMatch = qAnchorRegex.exec(combinedText)) !== null) {
    const qNum = parseInt(qMatch[1], 10);
    questionAnchors.push({
      qNum,
      index: qMatch.index,
      matchLen: qMatch[0].length,
    });
  }

  // Helper to determine which page a character index belongs to
  function getSourcePageForIndex(charIdx: number): number {
    for (const r of pageIndexRanges) {
      if (charIdx >= r.startIndex && charIdx <= r.endIndex) {
        return r.pageNumber;
      }
    }
    return 1;
  }

  for (let i = 0; i < questionAnchors.length; i++) {
    const current = questionAnchors[i];
    const next = questionAnchors[i + 1];

    const blockText = next
      ? combinedText.substring(current.index, next.index)
      : combinedText.substring(current.index);

    const sourcePage = getSourcePageForIndex(current.index);

    // Option detection regex:
    // Matches "A. ", "A) ", "(A) ", "(a) ", "A - ", etc.
    const optRegex = /(?:^|\n|\s)\s*(?:\(?([A-Da-d])\)|\b([A-Da-d])[\.\)\:\-])\s+/g;
    const optMatches: Array<{ letter: string; index: number; len: number }> = [];

    let oMatch: RegExpExecArray | null;
    while ((oMatch = optRegex.exec(blockText)) !== null) {
      const letter = (oMatch[1] || oMatch[2]).toUpperCase();
      optMatches.push({
        letter,
        index: oMatch.index,
        len: oMatch[0].length,
      });
    }

    let qText = '';
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';

    if (optMatches.length >= 4) {
      // Find the first occurrence of A, B, C, D in order
      const firstOptIndex = optMatches[0].index;
      const beforeOpts = blockText.substring(0, firstOptIndex);
      qText = beforeOpts
        .replace(/^(?:\s*(?:(?:Question|Q\.?)\s*)?\d{1,3}\s*[\.\)\:\-]\s+)/i, '')
        .trim()
        .replace(/\s+/g, ' ');

      // Extract options by boundary
      for (let j = 0; j < optMatches.length; j++) {
        const curOpt = optMatches[j];
        const nextOpt = optMatches[j + 1];
        const rawContent = nextOpt
          ? blockText.substring(curOpt.index + curOpt.len, nextOpt.index)
          : blockText.substring(curOpt.index + curOpt.len);

        const clean = rawContent.trim().replace(/\s+/g, ' ');
        if (curOpt.letter === 'A' && !optA) optA = clean;
        else if (curOpt.letter === 'B' && !optB) optB = clean;
        else if (curOpt.letter === 'C' && !optC) optC = clean;
        else if (curOpt.letter === 'D' && !optD) optD = clean;
      }
    } else {
      // Fallback: If options weren't separated by standard delimiters, store raw text for admin editing
      qText = blockText
        .replace(/^(?:\s*(?:(?:Question|Q\.?)\s*)?\d{1,3}\s*[\.\)\:\-]\s+)/i, '')
        .trim()
        .replace(/\s+/g, ' ');
    }

    extractedQuestions.push({
      question_number: current.qNum,
      question_text: qText || `Question ${current.qNum}`,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      source_page: sourcePage,
    });
  }

  return extractedQuestions;
}

/**
 * Main PDF processing pipeline for MCQ Question Papers.
 * 1. Validates PDF format, size, and integrity.
 * 2. Extracts page texts using unpdf.
 * 3. Identifies question pages (1 to N-1) and answer key page (last page N).
 * 4. Extracts questions and options.
 * 5. Extracts answer key and maps strictly by question number.
 * 6. Validates counts and completeness.
 */
export async function parseMcqPdf(
  buffer: Buffer | Uint8Array,
  filename: string,
  academicYear: number = 2
): Promise<ParsedPdfResult> {
  // Step 1: Validate file buffer
  const validation = validatePdfBuffer(buffer, filename);
  if (!validation.valid) {
    return {
      success: false,
      filename,
      academic_year: academicYear,
      total_pages: 0,
      questions_extracted: 0,
      answers_extracted: 0,
      valid_questions: 0,
      invalid_questions: 0,
      status: 'FAILED',
      error_message: validation.error || 'Invalid PDF file.',
      questions: [],
      answer_key: {},
      is_scanned_pdf: false,
    };
  }

  try {
    // Step 2: Extract text per page (unpdf strictly requires pure Uint8Array)
    const uint8 = buffer instanceof Uint8Array
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new Uint8Array(buffer);
    const extracted = await extractText(uint8, { mergePages: false });
    const totalPages = extracted.totalPages;

    if (totalPages < 2) {
      return {
        success: false,
        filename,
        academic_year: academicYear,
        total_pages: totalPages,
        questions_extracted: 0,
        answers_extracted: 0,
        valid_questions: 0,
        invalid_questions: 0,
        status: 'FAILED',
        error_message: 'Question paper must have at least 2 pages (Questions on pages 1 to N-1 and Answer Key on the last page).',
        questions: [],
        answer_key: {},
        is_scanned_pdf: false,
      };
    }

    // Step 3: Check for scanned/low-text pages
    let totalTextChars = 0;
    let lowTextPages = 0;
    for (const pageText of extracted.text) {
      const charCount = (pageText || '').trim().length;
      totalTextChars += charCount;
      if (charCount < 40) {
        lowTextPages++;
      }
    }

    const isScannedPdf = lowTextPages > 0 && totalTextChars < totalPages * 50;

    // Step 4: Identify Answer Key page (Starts with last page, searches backward if needed)
    let answerKeyPageIndex = totalPages - 1;
    let answerKeyMap = new Map<number, string>();

    // Test last page
    answerKeyMap = parseAnswerKeyFromText(extracted.text[answerKeyPageIndex]);

    // If last page had zero answers, search backwards up to 2 pages (in case of blank back-cover)
    if (answerKeyMap.size === 0 && totalPages >= 3) {
      for (let p = totalPages - 2; p >= 1; p--) {
        const potentialKey = parseAnswerKeyFromText(extracted.text[p]);
        if (potentialKey.size >= 3) {
          answerKeyPageIndex = p;
          answerKeyMap = potentialKey;
          break;
        }
      }
    }

    // Step 5: Extract question content from pages 0 to (answerKeyPageIndex - 1)
    const questionPages = extracted.text.slice(0, answerKeyPageIndex);
    const rawQuestions = parseQuestionsFromPageTexts(questionPages, academicYear);

    // Step 6: Map Question Number -> Correct Answer
    const questions: ParsedQuestionItem[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const rawQ of rawQuestions) {
      const qNum = rawQ.question_number;
      const mappedAnswer = answerKeyMap.get(qNum) || null;

      const reviewIssues: string[] = [];
      if (!rawQ.question_text || rawQ.question_text.trim().length < 5) {
        reviewIssues.push('Question text is incomplete');
      }
      if (!rawQ.option_a) reviewIssues.push('Missing Option A');
      if (!rawQ.option_b) reviewIssues.push('Missing Option B');
      if (!rawQ.option_c) reviewIssues.push('Missing Option C');
      if (!rawQ.option_d) reviewIssues.push('Missing Option D');
      if (!mappedAnswer) reviewIssues.push(`No answer key entry found for Question ${qNum}`);

      const isValid = reviewIssues.length === 0;
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      questions.push({
        question_number: qNum,
        question_text: rawQ.question_text,
        option_a: rawQ.option_a || '',
        option_b: rawQ.option_b || '',
        option_c: rawQ.option_c || '',
        option_d: rawQ.option_d || '',
        correct_answer: mappedAnswer,
        marks: 2, // Standard default: 2 marks per question
        academic_year: academicYear,
        source_page: rawQ.source_page,
        status: isValid ? 'VALID' : 'NEEDS_REVIEW',
        review_notes: reviewIssues.length > 0 ? reviewIssues.join('; ') : null,
        is_duplicate: 0,
      });
    }

    // Sort questions by question_number ascending
    questions.sort((a, b) => a.question_number - b.question_number);

    // Step 7: Answer Key count vs Question count validation
    const answersDetectedCount = answerKeyMap.size;
    const questionsDetectedCount = questions.length;

    let overallStatus: 'READY' | 'REVIEW_REQUIRED' | 'FAILED' = 'READY';
    let errorMessage: string | null = null;

    if (questionsDetectedCount === 0) {
      overallStatus = 'FAILED';
      errorMessage = isScannedPdf
        ? 'No readable text questions detected. The PDF appears to be a scanned image document. OCR review is required.'
        : 'Could not detect any questions in the standard format (e.g. 1. Question text, A. Option).';
    } else if (answersDetectedCount === 0) {
      overallStatus = 'REVIEW_REQUIRED';
      errorMessage = 'No answer key detected on the last page. Please review and input the answer key in the review screen.';
    } else if (answersDetectedCount !== questionsDetectedCount) {
      overallStatus = 'REVIEW_REQUIRED';
      errorMessage = `Answer key mismatch: Detected ${questionsDetectedCount} questions but ${answersDetectedCount} answer key entries.`;
    } else if (invalidCount > 0) {
      overallStatus = 'REVIEW_REQUIRED';
    }

    return {
      success: true,
      filename,
      academic_year: academicYear,
      total_pages: totalPages,
      questions_extracted: questionsDetectedCount,
      answers_extracted: answersDetectedCount,
      valid_questions: validCount,
      invalid_questions: invalidCount,
      status: overallStatus,
      error_message: errorMessage,
      questions,
      answer_key: Object.fromEntries(answerKeyMap),
      is_scanned_pdf: isScannedPdf,
    };
  } catch (err: any) {
    console.error('PDF parsing error in parseMcqPdf:', err);
    return {
      success: false,
      filename,
      academic_year: academicYear,
      total_pages: 0,
      questions_extracted: 0,
      answers_extracted: 0,
      valid_questions: 0,
      invalid_questions: 0,
      status: 'FAILED',
      error_message: err?.message || 'Failed to parse PDF document.',
      questions: [],
      answer_key: {},
      is_scanned_pdf: false,
    };
  }
}
