'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ActivityEventType } from '@/types';

interface ExamGuardOptions {
  enabled: boolean;
  studentId: string;
  attemptId: string;
  onSecurityEvent?: (type: ActivityEventType, details: Record<string, unknown>) => void;
  maxWarnings?: number;
}

export function useExamGuard({
  enabled,
  studentId,
  attemptId,
  onSecurityEvent,
  maxWarnings = 3,
}: ExamGuardOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [copyPasteCount, setCopyPasteCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const lastEventTimeRef = useRef<number>(0);
  const lastClipboardTimeRef = useRef<number>(0);
  const wasFullscreenRef = useRef<boolean>(false);

  const logEvent = useCallback(
    (type: ActivityEventType, details: Record<string, unknown>) => {
      // Debounce events within 500ms of same type
      const now = Date.now();
      if (now - lastEventTimeRef.current < 500 && details.rapid) {
        return;
      }
      lastEventTimeRef.current = now;

      // Call external handler if provided
      if (onSecurityEvent) {
        onSecurityEvent(type, details);
      }

      // Also fire background beacon / API call
      try {
        fetch('/api/exam/log-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            attemptId,
            eventType: type,
            details,
          }),
        }).catch(() => {});
      } catch {
        // Safe fail
      }
    },
    [studentId, attemptId, onSecurityEvent]
  );

  const issueWarning = useCallback(
    (reason: string, type: ActivityEventType) => {
      setWarningCount((prev) => {
        // Enforce warning count <= maxWarnings. NEVER exceed maxWarnings (e.g. never "4 of 3")
        const next = Math.min(prev + 1, maxWarnings);
        const msg =
          next >= maxWarnings
            ? `Maximum security warnings reached (${maxWarnings} of ${maxWarnings}). Continued departures will be flagged for disciplinary review by the Examination Committee.`
            : `Test security warning: ${reason}. Warning ${next} of ${maxWarnings}.`;

        setWarningMessage(msg);
        setShowWarningModal(true);
        logEvent('WARNING_TRIGGERED', {
          message: msg,
          warningNumber: next,
          maxWarnings,
          triggerEventType: type,
        });

        return next;
      });
    },
    [maxWarnings, logEvent]
  );

  const requestFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (elem as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
      wasFullscreenRef.current = true;
    } catch (err) {
      console.warn('Fullscreen request rejected or not permitted:', err);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // 1. Fullscreen changes: only count true fullscreen -> non-fullscreen transitions
    const handleFullscreenChange = () => {
      const isCurrentlyFull = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      setIsFullscreen(isCurrentlyFull);

      // Only trigger if student previously had entered fullscreen and now exited
      if (wasFullscreenRef.current && !isCurrentlyFull) {
        setFullscreenExitCount((prev) => {
          const next = prev + 1;
          logEvent('FULLSCREEN_EXIT', {
            count: next,
            reason: 'Student departed fullscreen examination view',
          });
          return next;
        });
        issueWarning('Fullscreen mode exited! Test regulations require full-screen view', 'FULLSCREEN_EXIT');
      }

      wasFullscreenRef.current = isCurrentlyFull;
    };

    // 2. Tab switching & window blur / visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          logEvent('TAB_SWITCH', {
            count: next,
            visibilityState: document.visibilityState,
            reason: 'Tab or application lost focus',
          });
          return next;
        });
        issueWarning('Tab switch detected! Leaving the assessment tab is strictly monitored', 'TAB_SWITCH');
      }
    };

    const handleWindowBlur = () => {
      // Window blur can happen alongside visibility change; log as blurred
      logEvent('TAB_SWITCH', {
        reason: 'Window blur detected',
        rapid: true,
      });
    };

    // 3. Clipboard event deterrence: Copy, Cut, Paste (debounced to prevent duplicate events)
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastClipboardTimeRef.current < 500) return;
      lastClipboardTimeRef.current = now;

      setCopyPasteCount((prev) => prev + 1);
      logEvent('COPY_ATTEMPT', { action: 'copy_blocked' });
      issueWarning('Copying text is prohibited during this assessment', 'COPY_ATTEMPT');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastClipboardTimeRef.current < 500) return;
      lastClipboardTimeRef.current = now;

      setCopyPasteCount((prev) => prev + 1);
      logEvent('PASTE_ATTEMPT', { action: 'paste_blocked' });
      issueWarning('Pasting content is prohibited during this assessment', 'PASTE_ATTEMPT');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastClipboardTimeRef.current < 500) return;
      lastClipboardTimeRef.current = now;

      setCopyPasteCount((prev) => prev + 1);
      logEvent('CUT_ATTEMPT', { action: 'cut_blocked' });
      issueWarning('Cutting content is restricted during this assessment', 'CUT_ATTEMPT');
    };

    // 4. Right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logEvent('SHORTCUT_ATTEMPT', { action: 'context_menu_prevented' });
    };

    // 5. Keydown shortcut monitoring (Ctrl+C, Ctrl+V, F12, DevTools)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        const actionName =
          e.key.toLowerCase() === 'c'
            ? 'Ctrl+C'
            : e.key.toLowerCase() === 'v'
            ? 'Ctrl+V'
            : e.key.toLowerCase() === 'x'
            ? 'Ctrl+X'
            : 'Ctrl+A';

        const now = Date.now();
        if (now - lastClipboardTimeRef.current >= 500) {
          lastClipboardTimeRef.current = now;
          setCopyPasteCount((prev) => prev + 1);
          logEvent('SHORTCUT_ATTEMPT', { shortcut: actionName });
          issueWarning(`Keyboard shortcut ${actionName} is restricted in CodeArena`, 'SHORTCUT_ATTEMPT');
        }
      }

      // Block F12 and Inspect shortcuts
      if (e.key === 'F12' || (isCtrlOrMeta && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        logEvent('SHORTCUT_ATTEMPT', { shortcut: 'DevTools shortcut attempted' });
        issueWarning('Developer tools shortcuts are blocked', 'SHORTCUT_ATTEMPT');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, maxWarnings, logEvent, issueWarning]);

  return {
    isFullscreen,
    tabSwitchCount,
    fullscreenExitCount,
    copyPasteCount,
    warningCount,
    warningMessage,
    showWarningModal,
    dismissWarning: () => setShowWarningModal(false),
    requestFullscreen,
  };
}
