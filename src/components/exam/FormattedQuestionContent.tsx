'use client';

import React from 'react';

interface FormattedQuestionContentProps {
  text: string;
  className?: string;
  showLineNumbers?: boolean;
}

export function cleanQuestionText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\f/g, '') // remove form-feed page break characters
    .replace(/(?:Table\s+\d+[:.]?|Table\s+continued|continued\s+on\s+next\s+page|Page\s+\d+\s+of\s+\d+)/gi, '')
    .trim();
}

interface Segment {
  type: 'text' | 'code';
  content: string;
}

export function parseQuestionSegments(input: string): Segment[] {
  const cleaned = cleanQuestionText(input);
  if (!cleaned) return [];

  // Check for explicit fenced markdown code blocks (```python ... ``` or ``` ... ```)
  const fencedRegex = /```(?:python|py)?\n?([\s\S]*?)```/g;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fencedRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      const before = cleaned.slice(lastIndex, match.index).trim();
      if (before) segments.push({ type: 'text', content: before });
    }
    segments.push({ type: 'code', content: match[1].replace(/\r\n/g, '\n') });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < cleaned.length) {
    const remaining = cleaned.slice(lastIndex);
    // If no fenced code blocks, check for embedded multi-line Python code patterns
    if (segments.length === 0) {
      const lines = remaining.split(/\r?\n/);
      let textBuffer: string[] = [];
      let codeBuffer: string[] = [];
      let inCode = false;

      const isCodeLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return inCode; // blank lines within code block stay in code
        return (
          /^(?:def\s+[a-zA-Z_]\w*\s*\(|class\s+[a-zA-Z_]\w*|import\s+\w+|from\s+\w+\s+import|if\s+.+:|elif\s+.+:|else:|for\s+.+in\s+.+:|while\s+.+:|try:|except.*:|finally:|with\s+.+:|return\b|print\(|\s{4,}|\t)/.test(
            line
          )
        );
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (isCodeLine(line)) {
          if (!inCode && textBuffer.length > 0) {
            segments.push({ type: 'text', content: textBuffer.join('\n').trim() });
            textBuffer = [];
          }
          inCode = true;
          codeBuffer.push(line);
        } else {
          if (inCode && codeBuffer.length > 0) {
            segments.push({ type: 'code', content: codeBuffer.join('\n') });
            codeBuffer = [];
          }
          inCode = false;
          textBuffer.push(line);
        }
      }

      if (codeBuffer.length > 0) {
        segments.push({ type: 'code', content: codeBuffer.join('\n') });
      }
      if (textBuffer.length > 0) {
        segments.push({ type: 'text', content: textBuffer.join('\n').trim() });
      }
    } else {
      const rest = remaining.trim();
      if (rest) segments.push({ type: 'text', content: rest });
    }
  }

  return segments.length > 0 ? segments : [{ type: 'text', content: cleaned }];
}

export const FormattedQuestionContent: React.FC<FormattedQuestionContentProps> = ({
  text,
  className = '',
  showLineNumbers = true,
}) => {
  const segments = parseQuestionSegments(text);

  return (
    <div className={`space-y-3 ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'code') {
          const lines = seg.content.split('\n');
          return (
            <div
              key={idx}
              className="relative my-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg overflow-hidden group select-text"
            >
              <div className="flex items-center justify-between px-4 py-1.5 bg-slate-800/80 border-b border-slate-700/60 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Python</span>
                </span>
                <span className="text-[10px] text-slate-500">{lines.length} lines</span>
              </div>
              <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-emerald-300 whitespace-pre">
                <code>
                  {lines.map((l, lIdx) => (
                    <div key={lIdx} className="table-row">
                      {showLineNumbers && (
                        <span className="table-cell pr-4 text-right select-none text-slate-600 text-xs font-mono">
                          {lIdx + 1}
                        </span>
                      )}
                      <span className="table-cell">{l}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          );
        }

        return (
          <div
            key={idx}
            className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap"
          >
            {seg.content}
          </div>
        );
      })}
    </div>
  );
};
