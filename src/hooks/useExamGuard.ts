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
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const lastEventTimeRef = useRef<number>(0);

  const logEvent = useCallback(
    (type: ActivityEventType, details: Record<string, unknown>) => {
      // Debounce events within 800ms of same type
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

  const triggerWarning = useCallback(
    (msg: string, type: ActivityEventType) => {
      setWarningMessage(msg);
      setShowWarningModal(true);
      logEvent('WARNING_TRIGGERED', { message: msg, triggerEventType: type });
    },
    [logEvent]
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
    } catch (err) {
      console.warn('Fullscreen request rejected or not permitted:', err);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // 1. Fullscreen changes
    const handleFullscreenChange = () => {
      const isCurrentlyFull = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      setIsFullscreen(isCurrentlyFull);

      if (!isCurrentlyFull) {
        setFullscreenExitCount((prev) => {
          const next = prev + 1;
          logEvent('FULLSCREEN_EXIT', {
            count: next,
            reason: 'Student left fullscreen mode',
          });
          triggerWarning(
            `Fullscreen mode exited! Test regulations require full-screen view. Warning ${next} of ${maxWarnings}.`,
            'FULLSCREEN_EXIT'
          );
          return next;
        });
      }
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
          triggerWarning(
            `Tab switch detected! Leaving the assessment tab is strictly monitored. Warning ${next} of ${maxWarnings}.`,
            'TAB_SWITCH'
          );
          return next;
        });
      }
    };

    const handleWindowBlur = () => {
      // Window blur can happen alongside visibility change; log as blurred
      logEvent('TAB_SWITCH', {
        reason: 'Window blur detected',
        rapid: true,
      });
    };

    // 3. Clipboard event deterrence: Copy, Cut, Paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      setCopyPasteCount((prev) => prev + 1);
      logEvent('COPY_ATTEMPT', { action: 'copy_blocked' });
      triggerWarning('Copying text is prohibited during this assessment.', 'COPY_ATTEMPT');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setCopyPasteCount((prev) => prev + 1);
      logEvent('PASTE_ATTEMPT', { action: 'paste_blocked' });
      triggerWarning('Pasting code is prohibited during this assessment.', 'PASTE_ATTEMPT');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      setCopyPasteCount((prev) => prev + 1);
      logEvent('CUT_ATTEMPT', { action: 'cut_blocked' });
      triggerWarning('Cutting content is restricted.', 'CUT_ATTEMPT');
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
        setCopyPasteCount((prev) => prev + 1);
        logEvent('SHORTCUT_ATTEMPT', { shortcut: actionName });
        triggerWarning(`Keyboard shortcut ${actionName} is restricted in CodeArena.`, 'SHORTCUT_ATTEMPT');
      }

      // Block F12 and Inspect shortcuts
      if (e.key === 'F12' || (isCtrlOrMeta && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        logEvent('SHORTCUT_ATTEMPT', { shortcut: 'DevTools shortcut attempted' });
        triggerWarning('Developer tools shortcuts are blocked.', 'SHORTCUT_ATTEMPT');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, maxWarnings, logEvent, triggerWarning]);

  return {
    isFullscreen,
    tabSwitchCount,
    fullscreenExitCount,
    copyPasteCount,
    warningMessage,
    showWarningModal,
    dismissWarning: () => setShowWarningModal(false),
    requestFullscreen,
  };
}
