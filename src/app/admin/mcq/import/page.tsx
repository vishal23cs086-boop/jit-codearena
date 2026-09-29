'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Sparkles,
  Layers,
  GraduationCap,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';

export default function McqPdfImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState<2 | 3>(2);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.toLowerCase().endsWith('.pdf')) {
        setFile(droppedFile);
        setErrorMessage(null);
      } else {
        setErrorMessage('Please upload a valid .pdf document.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.name.toLowerCase().endsWith('.pdf')) {
        setFile(selected);
        setErrorMessage(null);
      } else {
        setErrorMessage('Please upload a valid .pdf document.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a question paper PDF to import.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('academicYear', String(academicYear));

      const res = await fetch('/api/admin/mcq/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process PDF import.');
      }

      // Redirect directly to the Admin Review screen
      router.push(`/admin/mcq/import/${data.importId}`);
    } catch (err: any) {
      console.error('Import upload error:', err);
      setErrorMessage(err?.message || 'Server error while processing question paper PDF.');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/questions"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Import MCQ from PDF</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Automated Pipeline
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a question-paper PDF. Questions are extracted from pages 1 to N-1, and answer keys are detected from the final page.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Academic Year Selection */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>1. Select Target Academic Year</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Questions will be securely restricted and assigned exclusively to the chosen academic year.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Strict Year Isolation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => setAcademicYear(2)}
              className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                academicYear === 2
                  ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center ${
                  academicYear === 2 ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                }`}
              >
                {academicYear === 2 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">2nd Year (Semester 3 / 4)</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Assigned exclusively to 2nd-year student accounts.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAcademicYear(3)}
              className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                academicYear === 3
                  ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center ${
                  academicYear === 3 ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                }`}
              >
                {academicYear === 3 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">3rd Year (Semester 5 / 6)</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Assigned exclusively to 3rd-year student accounts.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: File Upload Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-indigo-600" />
              <span>2. Upload Question Paper PDF</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              File must be a standard PDF document containing MCQ questions followed by the Answer Key on the final page.
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
              dragActive
                ? 'border-indigo-600 bg-indigo-50/50'
                : file
                ? 'border-emerald-500 bg-emerald-50/30'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
            onClick={() => document.getElementById('pdf-file-input')?.click()}
          >
            <input
              id="pdf-file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {file ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{file.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for processing
                  </div>
                </div>
                <span className="text-xs text-indigo-600 font-semibold hover:underline mt-1">
                  Click to replace file
                </span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Click to browse or drag and drop your PDF here
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Supports text-based and scanned PDFs up to 15MB
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Format Guidance Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5 font-mono">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 font-sans">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Expected PDF Structure:</span>
            </div>
            <div className="text-slate-600">
              • <strong className="text-slate-700">Pages 1 to N-1:</strong> Questions (e.g. 1. What is Python? A. ... B. ... C. ... D. ...)
            </div>
            <div className="text-slate-600">
              • <strong className="text-slate-700">Last Page:</strong> Answer Key (e.g. 1 - B, 2 - B, 3 - C, 4 - D ...)
            </div>
            <div className="text-slate-600">
              • <strong className="text-slate-700">Defaults:</strong> 2 marks per question • Standard 30-question assessment (60 total marks)
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/questions"
            className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!file || isUploading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting Questions & Answers...</span>
              </>
            ) : (
              <>
                <span>Process & Review Questions</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
