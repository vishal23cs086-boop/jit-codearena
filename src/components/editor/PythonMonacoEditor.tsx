'use client';

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { RotateCcw, Check, Sparkles, Code2, ZoomIn, ZoomOut } from 'lucide-react';

interface PythonMonacoEditorProps {
  code: string;
  onChange: (value: string) => void;
  starterCode?: string;
  isReadOnly?: boolean;
  saveStatus?: 'saved' | 'saving' | 'unsaved';
  lastSavedText?: string;
}

export const PythonMonacoEditor: React.FC<PythonMonacoEditorProps> = ({
  code,
  onChange,
  starterCode,
  isReadOnly = false,
  saveStatus = 'saved',
  lastSavedText = 'All changes saved',
}) => {
  const [fontSize, setFontSize] = useState<number>(14);

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  const handleReset = () => {
    if (starterCode && window.confirm('Reset code to starter template? Your current edits will be replaced.')) {
      onChange(starterCode);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#181818] border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md font-mono font-medium">
            <Code2 className="w-3.5 h-3.5" />
            <span>Python 3.8+</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-400 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                {lastSavedText}
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Unsaved changes
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Font size zoom */}
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-md px-1.5 py-0.5 border border-slate-700/50">
            <button
              onClick={() => setFontSize((s) => Math.max(12, s - 1))}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Decrease font size"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-1">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(22, s + 1))}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Increase font size"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Reset starter code */}
          {starterCode && !isReadOnly && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition border border-transparent hover:border-slate-700"
              title="Reset to starter code"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Monaco Code Editor */}
      <div className="flex-1 w-full relative">
        <Editor
          height="100%"
          language="python"
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          options={{
            readOnly: isReadOnly,
            fontSize,
            fontFamily: "var(--font-mono, 'Fira Code', 'Cascadia Code', Consolas, monospace)",
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 4,
            insertSpaces: true,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
          }}
          loading={
            <div className="flex items-center justify-center h-full text-slate-500 gap-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Loading Monaco Python Engine...</span>
            </div>
          }
        />
      </div>
    </div>
  );
};
