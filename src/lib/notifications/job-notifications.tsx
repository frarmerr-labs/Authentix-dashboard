'use client';

/**
 * JOB NOTIFICATION CONTEXT
 *
 * Tracks background certificate generation jobs globally — persisted in
 * localStorage so state survives in-app navigation.
 *
 * Polling runs every 5 s for any queued/running job.  On completion,
 * a browser notification fires (if the user granted permission).
 *
 * Usage:
 *   1. Wrap the app in <JobNotificationProvider>.
 *   2. Call addJob(jobId, label) immediately after batchGenerate() returns.
 *   3. The bell badge and dropdown update automatically.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { api, ApiError } from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface BackgroundJob {
  id: string;
  label: string;
  submittedAt: string;
  status: JobStatus;
  totalCertificates?: number;
  downloadUrl?: string;
  error?: string;
  seen: boolean;
  /** Chunked progress — present while the job is still running large batches */
  progress?: { processed: number; total: number };
}

interface JobNotificationContextValue {
  jobs: BackgroundJob[];
  unseenCount: number;
  addJob: (jobId: string, label: string) => void;
  markAllSeen: () => void;
  clearJob: (jobId: string) => void;
  requestNotificationPermission: () => Promise<boolean>;
  notificationPermission: NotificationPermission | 'unsupported';
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'authentix_bg_jobs';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const POLL_INTERVAL_MS = 5000;

function loadJobs(): BackgroundJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BackgroundJob[];
    const cutoff = Date.now() - MAX_AGE_MS;
    return parsed.filter(j => new Date(j.submittedAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveJobs(jobs: BackgroundJob[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch { /* localStorage unavailable */ }
}

// ── Context ───────────────────────────────────────────────────────────────────

const JobNotificationContext = createContext<JobNotificationContextValue | null>(null);

export function JobNotificationProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >('default');

  // Keep a stable ref so the polling interval always sees current state
  const jobsRef = useRef<BackgroundJob[]>([]);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  // ── Hydrate from localStorage on mount ──────────────────────────────────────
  useEffect(() => {
    setJobs(loadJobs());
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  // ── Persist whenever jobs change ────────────────────────────────────────────
  useEffect(() => {
    saveJobs(jobs);
  }, [jobs]);

  // ── Polling loop — runs once, reads jobsRef each tick ───────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const pending = jobsRef.current.filter(
        j => j.status === 'queued' || j.status === 'running',
      );
      if (pending.length === 0) return;

      await Promise.allSettled(
        pending.map(async job => {
          try {
            const status = await api.certificates.pollJobStatus(job.id);

            // Always extract partial progress even while still running
            const rawResult = status.result as Record<string, unknown> | undefined;
            const partialProcessed = rawResult?.processed_so_far as number | undefined;
            const partialTotal = rawResult?.total as number | undefined;
            if (
              (status.status === 'queued' || status.status === 'running') &&
              partialProcessed !== undefined &&
              partialTotal !== undefined
            ) {
              setJobs(prev =>
                prev.map(j =>
                  j.id === job.id
                    ? { ...j, progress: { processed: partialProcessed, total: partialTotal } }
                    : j,
                ),
              );
              return;
            }

            if (status.status !== 'completed' && status.status !== 'failed') return;

            const totalCerts =
              status.result?.total_certificates ??
              status.result?.results?.reduce((s: number, r: any) => s + (r.count ?? 0), 0);
            const downloadUrl =
              status.result?.last_download_url ??
              status.result?.results?.[0]?.download_url ??
              undefined;

            setJobs(prev =>
              prev.map(j => {
                if (j.id !== job.id) return j;
                return {
                  ...j,
                  status: status.status as JobStatus,
                  totalCertificates: typeof totalCerts === 'number' ? totalCerts : undefined,
                  downloadUrl: downloadUrl ?? undefined,
                  error: status.error ?? undefined,
                  progress: undefined,
                  seen: false,
                };
              }),
            );

            // Fire browser notification
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              if (status.status === 'completed') {
                const count = typeof totalCerts === 'number' ? totalCerts : null;
                new Notification('Certificates Ready!', {
                  body: count
                    ? `${count} certificate${count !== 1 ? 's are' : ' is'} ready to download.`
                    : 'Your certificates are ready to download.',
                  icon: '/favicon.ico',
                  tag: `job-${job.id}`,
                });
              } else {
                new Notification('Generation Failed', {
                  body: status.error ?? 'Certificate generation failed. Please try again.',
                  icon: '/favicon.ico',
                  tag: `job-${job.id}`,
                });
              }
            }
          } catch (err) {
            // On session expiry, mark the job failed so polling stops instead of
            // hammering the backend with 401s every 5 seconds indefinitely.
            if (err instanceof ApiError && err.code === 'UNAUTHORIZED') {
              setJobs(prev =>
                prev.map(j =>
                  j.id === job.id
                    ? { ...j, status: 'failed' as JobStatus, error: 'Session expired — please refresh and sign in again.' }
                    : j,
                ),
              );
            }
            // All other errors are silently ignored — job will be retried next tick
          }
        }),
      );
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []); // intentionally empty — reads jobsRef, not jobs

  // ── Actions ──────────────────────────────────────────────────────────────────

  const addJob = useCallback((jobId: string, label: string) => {
    const newJob: BackgroundJob = {
      id: jobId,
      label,
      submittedAt: new Date().toISOString(),
      status: 'queued',
      seen: false,
    };
    setJobs(prev => [newJob, ...prev.filter(j => j.id !== jobId)]);
  }, []);

  const markAllSeen = useCallback(() => {
    setJobs(prev => prev.map(j => ({ ...j, seen: true })));
  }, []);

  const clearJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  }, []);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission === 'granted';
  }, []);

  // Count jobs that the user hasn't seen yet (all statuses)
  const unseenCount = jobs.filter(j => !j.seen).length;

  return (
    <JobNotificationContext.Provider
      value={{
        jobs,
        unseenCount,
        addJob,
        markAllSeen,
        clearJob,
        requestNotificationPermission,
        notificationPermission,
      }}
    >
      {children}
    </JobNotificationContext.Provider>
  );
}

export function useJobNotifications() {
  const ctx = useContext(JobNotificationContext);
  if (!ctx) throw new Error('useJobNotifications must be used inside JobNotificationProvider');
  return ctx;
}
