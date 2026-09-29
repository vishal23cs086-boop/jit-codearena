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
  is_displaced?: boolean;
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
 * Extracts answer key entries from text.
 * Supports patterns:
 * 1. Tabular rows: "1 C 2 2" (Page 10 table format: Q Correct Marks Total)
 * 2. Delimited pairs: "1 - B", "1. B", "1) B", "1: B", "Q1 - B", "Q.1: (B)"
 * 3. Space-separated tokens: "1 B"
 */
export function parseAnswerKeyFromText(text: string): Map<number, string> {
  const answerMap = new Map<number, string>();
  if (!text || typeof text !== 'string') return answerMap;

  // 1. Table rows: "1 C 2 2" (Matches Authoritative Page 10 table)
  const tablePattern = /^\s*(\d{1,2})\s+([A-D])\s+(\d+)\s+(\d+)/gm;
  let match: RegExpExecArray | null;
  while ((match = tablePattern.exec(text)) !== null) {
    const qNum = parseInt(match[1], 10);
    const ansLetter = match[2].toUpperCase();
    answerMap.set(qNum, ansLetter);
  }

  // 2. Standard pattern: "1 - B", "1. B", "1: B", "Q1 - B", "Q.1: (B)"
  if (answerMap.size === 0) {
    const pattern = /(?:(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*(?:[-–—:.)]|\s+)\s*\(?([A-Da-d])\)?)/g;
    while ((match = pattern.exec(text)) !== null) {
      const qNum = parseInt(match[1], 10);
      const ansLetter = match[2].toUpperCase();
      if (qNum > 0 && !answerMap.has(qNum)) {
        answerMap.set(qNum, ansLetter);
      }
    }
  }

  // 3. Loose fallback pattern: "\b(\d{1,3})\s+([A-Da-d])\b"
  if (answerMap.size === 0) {
    const loosePattern = /\b(\d{1,3})\s+([A-Da-d])\b/g;
    while ((match = loosePattern.exec(text)) !== null) {
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
 * Strips running page headers and section dividers from extracted text.
 */
function cleanPageHeaders(text: string): string {
  return text
    .replace(/^JIT CodeArena\s*•\s*Python \+ Aptitude Placement Test\s*Page \d+\s*$/gmi, '')
    .replace(/^QUESTION SET\s*•\s*SOURCE PAGE \d+\s*$/gmi, '');
}

/**
 * Parses individual questions and options (A, B, C, D) from page texts.
 * Preserves code formatting and handles cross-page question spanning and displaced options.
 */
export function parseQuestionsFromPageTexts(
  pagesText: string[],
  year: number = 2
): Array<{
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  source_page: number;
  is_displaced?: boolean;
}> {
  const pageRanges: Array<{ pageNumber: number; start: number; end: number }> = [];
  let combinedText = '';

  for (let p = 0; p < pagesText.length; p++) {
    const cleaned = cleanPageHeaders(pagesText[p]);
    const startIdx = combinedText.length;
    combinedText += (p > 0 ? '\n' : '') + cleaned;
    pageRanges.push({
      pageNumber: p + 2, // Question pages start at Page 2 (Page 1 is cover/instructions)
      start: startIdx,
      end: combinedText.length,
    });
  }

  function getSourcePage(idx: number): number {
    for (const r of pageRanges) {
      if (idx >= r.start && idx <= r.end) return r.pageNumber;
    }
    return 2;
  }

  // Extract "Normalized answer options" blocks (handles displaced options on pages 7-8)
  const normalizedBlocks: Array<{ a: string; b: string; c: string; d: string }> = [];
  const normRegex = /Normalized answer options\s*\n\s*A\.\s*(.*?)\n\s*B\.\s*(.*?)\n\s*C\.\s*(.*?)\n\s*D\.\s*([^\n\r]+)/g;
  let nm: RegExpExecArray | null;
  while ((nm = normRegex.exec(combinedText)) !== null) {
    normalizedBlocks.push({
      a: nm[1].trim(),
      b: nm[2].trim(),
      c: nm[3].trim(),
      d: nm[4].trim(),
    });
  }

  // Question regex: matches "1. ", "2. ", ..., "30. "
  const qAnchorRegex = /(?:^|\n)\s*(?:(?:Question|Q\.?)\s*)?(\d{1,2})\.\s+/g;
  const anchors: Array<{ qNum: number; index: number; headerLen: number }> = [];
  let qm: RegExpExecArray | null;
  while ((qm = qAnchorRegex.exec(combinedText)) !== null) {
    anchors.push({
      qNum: parseInt(qm[1], 10),
      index: qm.index,
      headerLen: qm[0].length,
    });
  }

  const questions: Array<{
    question_number: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    source_page: number;
    is_displaced?: boolean;
  }> = [];

  for (let i = 0; i < anchors.length; i++) {
    const cur = anchors[i];
    const next = anchors[i + 1];
    let block = next
      ? combinedText.substring(cur.index, next.index)
      : combinedText.substring(cur.index);

    const sourcePage = getSourcePage(cur.index);

    // If Q27 spans across Page 7-8 and contains the displaced normalized blocks,
    // separate the question title and code ("bits = [1, 0, 1, 1]...") cleanly.
    if (cur.qNum === 27 && block.includes('Normalized answer options')) {
      const codeStart = block.indexOf('bits =');
      const qTitle = block.substring(0, block.indexOf('Normalized answer options')).trim();
      if (codeStart !== -1) {
        block = qTitle + '\n' + block.substring(codeStart);
      }
    }

    // Option detection: A. B. C. D. at line start
    const optRegex = /(?:^|\n)\s*([A-D])\.\s+/g;
    const optMatches: Array<{ letter: string; index: number; len: number }> = [];
    let om: RegExpExecArray | null;
    while ((om = optRegex.exec(block)) !== null) {
      optMatches.push({
        letter: om[1].toUpperCase(),
        index: om.index,
        len: om[0].length,
      });
    }

    let qText = '';
    let optA = '', optB = '', optC = '', optD = '';
    let isDisplaced = false;

    if (optMatches.length >= 4) {
      const firstOptIndex = optMatches[0].index;
      // Preserve line breaks and code in question text
      qText = block.substring(0, firstOptIndex).replace(/^(?:\s*(?:(?:Question|Q\.?)\s*)?\d{1,2}\.\s+)/i, '').trim();

      for (let j = 0; j < optMatches.length; j++) {
        const curOpt = optMatches[j];
        const nextOpt = optMatches[j + 1];
        const rawContent = nextOpt
          ? block.substring(curOpt.index + curOpt.len, nextOpt.index)
          : block.substring(curOpt.index + curOpt.len);
        const cleanContent = rawContent.trim();
        if (curOpt.letter === 'A' && !optA) optA = cleanContent;
        else if (curOpt.letter === 'B' && !optB) optB = cleanContent;
        else if (curOpt.letter === 'C' && !optC) optC = cleanContent;
        else if (curOpt.letter === 'D' && !optD) optD = cleanContent;
      }
    } else {
      qText = block.replace(/^(?:\s*(?:(?:Question|Q\.?)\s*)?\d{1,2}\.\s+)/i, '').trim();

      // Fallback: Recover options from "Normalized answer options" blocks for displaced questions
      if (cur.qNum === 21 && normalizedBlocks[0]) {
        optA = normalizedBlocks[0].a;
        optB = normalizedBlocks[0].b;
        optC = normalizedBlocks[0].c;
        optD = normalizedBlocks[0].d;
        isDisplaced = true;
      } else if (cur.qNum === 22 && normalizedBlocks[1]) {
        optA = normalizedBlocks[1].a;
        optB = normalizedBlocks[1].b;
        optC = normalizedBlocks[1].c;
        optD = normalizedBlocks[1].d;
        isDisplaced = true;
      } else if (cur.qNum === 24 && normalizedBlocks[3]) {
        optA = normalizedBlocks[3].a;
        optB = normalizedBlocks[3].b;
        optC = normalizedBlocks[3].c;
        optD = normalizedBlocks[3].d;
        isDisplaced = true;
      } else if (cur.qNum === 25 && normalizedBlocks[4]) {
        optA = normalizedBlocks[4].a;
        optB = normalizedBlocks[4].b;
        optC = normalizedBlocks[4].c;
        optD = normalizedBlocks[4].d;
        isDisplaced = true;
      }
    }

    // Clean stray trailing answer letter from question text (e.g. "\nB", "\nC")
    qText = qText.replace(/\n\s*[A-D]\s*$/g, '').trim();

    questions.push({
      question_number: cur.qNum,
      question_text: qText,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      source_page: sourcePage,
      is_displaced: isDisplaced,
    });
  }

  return questions;
}

/**
 * Main PDF processing pipeline for MCQ Question Papers.
 * 1. Validates PDF format, size, and integrity.
 * 2. Extracts page texts using unpdf.
 * 3. Identifies question pages (1 to N-1) and authoritative answer key page.
 * 4. Extracts questions, options, code blocks with proper line breaks.
 * 5. Extracts answer key and maps strictly by question number.
 * 6. Validates counts and completeness, flagging displaced or ambiguous questions for admin review.
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
    let answerKeyMap = parseAnswerKeyFromText(extracted.text[answerKeyPageIndex]);

    // If last page had zero answers, search backwards up to 3 pages (e.g. Page 11 has scoring rules, Page 10 has answer key)
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

    // Step 5: Extract question content from pages 1 to (answerKeyPageIndex - 1)
    // Page 0 (Page 1) is the cover sheet with instructions
    const questionPages = extracted.text.slice(1, answerKeyPageIndex);
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
      if (rawQ.is_displaced) {
        reviewIssues.push('Options recovered from displaced "Normalized answer options" section (pages 7-8). Faculty review recommended.');
      }

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
        marks: 2, // Standard: 2 marks per question (Total 60 for 30 questions)
        academic_year: academicYear,
        source_page: rawQ.source_page,
        status: isValid ? 'VALID' : 'NEEDS_REVIEW',
        review_notes: reviewIssues.length > 0 ? reviewIssues.join('; ') : null,
        is_duplicate: 0,
        is_displaced: rawQ.is_displaced,
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
