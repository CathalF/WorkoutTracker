import { useRef, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseRestTimerOptions {
  onComplete: () => void;
}

export interface UseRestTimerReturn {
  secondsRemaining: number;
  isRunning: boolean;
  totalDuration: number;
  startTimer: (durationSeconds: number) => void;
  stopTimer: () => void;
  adjustTime: (deltaSeconds: number) => void;
}

export default function useRestTimer({ onComplete }: UseRestTimerOptions): UseRestTimerReturn {
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);

  const endTimeRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Keep onComplete ref current
  onCompleteRef.current = onComplete;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setSecondsRemaining(remaining);
    if (remaining <= 0) {
      clearTimer();
      isRunningRef.current = false;
      setIsRunning(false);
      setSecondsRemaining(0);
      onCompleteRef.current();
    }
  }, [clearTimer]);

  const startTimer = useCallback((durationSeconds: number) => {
    clearTimer();
    endTimeRef.current = Date.now() + durationSeconds * 1000;
    totalDurationRef.current = durationSeconds;
    setTotalDuration(durationSeconds);
    setSecondsRemaining(durationSeconds);
    isRunningRef.current = true;
    setIsRunning(true);
    intervalRef.current = setInterval(tick, 250);
  }, [clearTimer, tick]);

  const stopTimer = useCallback(() => {
    clearTimer();
    isRunningRef.current = false;
    setIsRunning(false);
    setSecondsRemaining(0);
  }, [clearTimer]);

  const adjustTime = useCallback((deltaSeconds: number) => {
    if (!isRunningRef.current) return;
    endTimeRef.current += deltaSeconds * 1000;
    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    if (remaining <= 0) {
      clearTimer();
      isRunningRef.current = false;
      setIsRunning(false);
      setSecondsRemaining(0);
      onCompleteRef.current();
    } else {
      setSecondsRemaining(remaining);
      // Update total duration so progress bar stays meaningful
      const elapsed = totalDurationRef.current - remaining + deltaSeconds;
      totalDurationRef.current = Math.max(remaining, totalDurationRef.current + deltaSeconds);
      setTotalDuration(totalDurationRef.current);
    }
  }, [clearTimer]);

  // Handle app state transitions (background → foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        (appStateRef.current === 'inactive' || appStateRef.current === 'background') &&
        nextState === 'active' &&
        isRunningRef.current
      ) {
        // Recalculate remaining time after returning from background
        tick();
        // Restart interval (may have been suspended by OS)
        clearTimer();
        if (isRunningRef.current) {
          intervalRef.current = setInterval(tick, 250);
        }
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [tick, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { secondsRemaining, isRunning, totalDuration, startTimer, stopTimer, adjustTime };
}
