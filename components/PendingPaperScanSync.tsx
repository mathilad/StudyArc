import React, { useEffect, useRef } from "react";
import { useAppConfig } from "../context/AppConfigContext";
import { useAuth } from "../context/AuthContext";
import { useIntelligence } from "../context/IntelligenceContext";
import { useOffline } from "../context/OfflineContext";
import { listQueuedPaperScans, readQueuedPaperScan, recordPaperScanAttempt, removeQueuedPaperScan } from "../lib/paperScanQueue";
import { analyseAnswerSheet } from "../lib/visionCapture";

export default function PendingPaperScanSync() {
  const { user } = useAuth();
  const { settings } = useAppConfig();
  const { isOnline, syncTick } = useOffline();
  const { saveCaptureAnalysis } = useIntelligence();
  const running = useRef(false);
  const scanningEnabled = settings.featureFlags.captureScanning !== false;

  useEffect(() => {
    if (!user || !isOnline || !scanningEnabled || running.current) return;
    let cancelled = false;

    const processQueue = async () => {
      running.current = true;
      try {
        const pending = await listQueuedPaperScans(user.id);
        for (const item of pending) {
          if (cancelled) break;
          if (item.nextAttemptAt && new Date(item.nextAttemptAt).getTime() > Date.now()) continue;
          try {
            const job = await readQueuedPaperScan(item.id);
            if (!job) continue;
            await recordPaperScanAttempt(item.id);
            const analysis = await analyseAnswerSheet(job.pages, job.reference, job.subjectNames, { paperDate: job.paperDate, silent: true });
            const detectedSubject = job.subjectNames.find(name => name.toLowerCase() === String(analysis.subjectName ?? "").toLowerCase()) ?? job.selectedSubject;
            await saveCaptureAnalysis(
              "answer_sheet",
              job.pages.map(page => page.filename).join(" | "),
              String(analysis.summary ?? "Offline paper scanned automatically when internet returned."),
              {
                ...analysis,
                confirmedSubject: detectedSubject,
                paperDate: job.paperDate,
                sourceClassId: job.sourceClassId,
                queuedOffline: true,
                queuedAt: job.createdAt,
                autoScannedAt: new Date().toISOString(),
                requiresReview: true,
                pageOrder: job.pages.map((page, index) => ({ page: index + 1, filename: page.filename })),
                referenceFile: job.reference?.filename ?? null,
              },
            );
            await removeQueuedPaperScan(item.id);
          } catch (error) {
            await recordPaperScanAttempt(item.id, error).catch(() => undefined);
          }
        }
      } finally {
        running.current = false;
      }
    };

    void processQueue();
    return () => { cancelled = true; };
  }, [isOnline, saveCaptureAnalysis, scanningEnabled, syncTick, user]);

  return null;
}
