# 🏛️ JIT CodeArena

**JIT CodeArena** is a college-specific online Python coding assessment and examination platform tailored for 2nd and 3rd year engineering students (Computer Science, Information Technology, Artificial Intelligence & Data Science, Electronics & Communication).

Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL**, **Monaco Editor**, and **Judge0 API**.

---

## ⚡ Key Highlights & Architecture

- **LeetCode-Style Python IDE**: Split-pane layout with Monaco editor, syntax highlighting, reset starter code, custom test case execution, and sample problem explanations.
- **Server-Isolated Python Execution**: Student Python code is dispatched via Next.js backend API to Judge0 sandboxed workers. Arbitrary code is **never** executed directly on the application server.
- **Hidden Test Case Security**: Evaluation cases are strictly kept server-side and never leaked to the student's browser.
- **Automated Multi-Metric Grading**:
  - Test-case correctness: 70%
  - Time performance: 15%
  - Code quality: 10%
  - Submission attempts: 5%
- **Server-Controlled Countdown & Auto-Save**: Progress is auto-saved every 25 seconds and during question navigation. Tests automatically submit when the server countdown expires.
- **Browser-Level Anti-Cheating Deterrents**:
  - Fullscreen enforcement
  - Real-time tab switch and visibility loss detection
  - Disabled copy, cut, paste, and right-click context menu
  - Blocked keyboard shortcuts (Ctrl+C, Ctrl+V, F12, DevTools)
  - Real-time warnings and audit trail
- **Admin Examination Control Center**:
  - **Live Exam Monitor**: Real-time candidate telemetry table with status badges (🟢 Active, 🟡 Warning, 🔴 Suspicious, ✅ Completed). Drilldown into any student's live question progress and incident logs.
  - **First-Completion Tracking**: Records exact server-side completion timestamps. Separate sort modes for finish order (1st, 2nd, 3rd completed) vs highest score ranking.
  - **Question Bank**: Create, edit, and categorize algorithmic challenges with public and hidden test cases.
  - **Test Management**: Schedule tests, assign eligible departments/years, publish/start/end examinations.
  - **Analytics & Reports**: Visual Recharts analytics (histograms, failure rates, department comparisons) and one-click CSV export.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies

```bash
cd jit-codearena
npm install
```

### 2. Configure Supabase PostgreSQL

1. Create a project at [supabase.com](https://supabase.com).
2. Open your Supabase project dashboard -> **SQL Editor**.
3. Open `supabase/schema.sql` from this repository, copy its contents, and click **Run**.
4. This will create:
   - Tables: `profiles`, `students`, `questions`, `test_cases`, `tests`, `test_questions`, `test_attempts`, `student_answers`, `submissions`, `activity_logs`.
   - Row Level Security (RLS) policies protecting hidden test cases and candidate answers.
   - Database trigger `set_completion_rank()` for server-side completion tracking.
   - Pre-populated Python algorithmic problems with test cases.

### 3. Configure Judge0 API

You can use either:
- **RapidAPI Judge0 CE** (Free tier available):
  1. Subscribe to [Judge0 CE on RapidAPI](https://rapidapi.com/hermanzdosilovic/api/judge0-ce).
  2. Copy your RapidAPI Key.
- **Self-Hosted Judge0 Docker instance**:
  - Point `JUDGE0_API_URL` to your instance (e.g. `http://your-server-ip:2358`).

*(Note: JIT CodeArena includes a built-in safe execution fallback so the application works out-of-the-box even before you insert your Judge0 API key!)*

### 4. Configure Environment Variables

Create `.env.local` based on `.env.example`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Judge0 API
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_or_judge0_key
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧑‍🎓 Demo Credentials & Candidate Profiles

| Role | Name | Register Number | Department & Year | Login Shortcut |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | Harish Kumar S | `22CS084` | CSE (Year 3) | Click on homepage pill |
| **Student** | Priya Sundaram | `23IT045` | IT (Year 2) | Click on homepage pill |
| **Student** | Vignesh Raman | `22AD012` | AI&DS (Year 3) | Click on homepage pill |
| **Student** | Ananya Meenakshi | `23EC031` | ECE (Year 2) | Click on homepage pill |
| **Admin** | Dr. M. Murugan (HOD) | `FAC-CSE-01` | CSE Exam Cell | Click "Switch to Admin" |

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. In the Vercel dashboard under **Settings > Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JUDGE0_API_URL`
   - `JUDGE0_API_KEY`
   - `JUDGE0_API_HOST`
   - `NEXT_PUBLIC_APP_URL`
4. Click **Deploy**. The platform is completely Vercel-ready with zero server-side state lock.

---

## 🛡️ Assessment Security & Proctoring Rules

1. **Mandatory Fullscreen**: Exiting fullscreen triggers immediate modal warning and increments incident count.
2. **Tab Switch Monitoring**: Unfocusing the test tab or switching windows triggers a recorded alert.
3. **Clipboard Protection**: Copy, Cut, Paste, and Right-click are disabled in the coding pane.
4. **Server Timestamping**: Server timestamps prevent local clock tampering.
5. **No Client Hidden Tests**: Evaluation cases are never dispatched to browser network requests.

---

© 2026 JIT CodeArena • Department of Computer Science & Engineering
