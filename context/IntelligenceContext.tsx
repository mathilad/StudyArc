import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  cacheKey,
  enqueueMutation,
  makeUuid,
  queuedMutationsFor,
  readJson,
  removeQueuedMutation,
  writeJson,
} from "../lib/offlineStore";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";

export type MistakeType =
  | "Concept gap"
  | "Memory error"
  | "Calculation error"
  | "Misread question"
  | "Time-management issue"
  | "Careless error";

export type StudyMistake = {
  id: string;
  subjectName: string;
  topicName: string;
  source: string;
  sourceLabel: string | null;
  questionRef: string | null;
  mistakeType: MistakeType;
  note: string | null;
  confidence: number | null;
  resolved: boolean;
  correctStreak: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
};

export type PaperQuestionResult = {
  id: string;
  sessionId: string | null;
  subjectName: string;
  topicName: string;
  paperLabel: string | null;
  questionNo: string;
  marksAwarded: number;
  marksTotal: number;
  durationSeconds: number | null;
  confidence: number | null;
  mistakeType: MistakeType | null;
  difficultyRating: number | null;
  createdAt: string;
};

export type SessionOutcome = {
  id: string;
  sessionId: string | null;
  goalText: string | null;
  targetCount: number | null;
  completedCount: number | null;
  energyBefore: number | null;
  energyAfter: number | null;
  interruptionCount: number;
  distractionNotes: string[];
  environmentLabel: string | null;
  createdAt: string;
};

export type PlanSnapshot = {
  id: string;
  planDate: string;
  studyMinutes: number;
  revisionMinutes: number;
  classMinutes: number;
  assignmentCount: number;
  priorityLabels: string[];
  healthScore: number | null;
  createdAt: string;
};

export type CaptureAnalysis = {
  id: string;
  captureKind: string;
  sourceName: string | null;
  summary: string | null;
  analysis: Record<string, unknown>;
  createdAt: string;
};

export type RemoteActiveStudyState = {
  snapshot: Record<string, unknown>;
  deviceLabel: string | null;
  updatedAt: string;
} | null;

type Cache = {
  mistakes: StudyMistake[];
  questionResults: PaperQuestionResult[];
  outcomes: SessionOutcome[];
  planSnapshots: PlanSnapshot[];
  captures: CaptureAnalysis[];
};

const EMPTY: Cache = {
  mistakes: [],
  questionResults: [],
  outcomes: [],
  planSnapshots: [],
  captures: [],
};

const KINDS = [
  "mistake_upsert",
  "question_result_upsert",
  "outcome_upsert",
  "plan_snapshot_upsert",
  "capture_analysis_insert",
];

const mapMistake = (row: any): StudyMistake => ({
  id: row.id,
  subjectName: row.subject_name,
  topicName: row.topic_name,
  source: row.source,
  sourceLabel: row.source_label ?? null,
  questionRef: row.question_ref ?? null,
  mistakeType: row.mistake_type as MistakeType,
  note: row.note ?? null,
  confidence: row.confidence == null ? null : Number(row.confidence),
  resolved: Boolean(row.resolved),
  correctStreak: Number(row.correct_streak ?? 0),
  nextReviewAt: row.next_review_at ?? null,
  lastReviewedAt: row.last_reviewed_at ?? null,
  createdAt: row.created_at,
});

const mapQuestion = (row: any): PaperQuestionResult => ({
  id: row.id,
  sessionId: row.session_id ?? null,
  subjectName: row.subject_name,
  topicName: row.topic_name,
  paperLabel: row.paper_label ?? null,
  questionNo: row.question_no,
  marksAwarded: Number(row.marks_awarded ?? 0),
  marksTotal: Number(row.marks_total ?? 1),
  durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
  confidence: row.confidence == null ? null : Number(row.confidence),
  mistakeType: (row.mistake_type ?? null) as MistakeType | null,
  difficultyRating: row.difficulty_rating == null ? null : Number(row.difficulty_rating),
  createdAt: row.created_at,
});

const mapOutcome = (row: any): SessionOutcome => ({
  id: row.id,
  sessionId: row.session_id ?? null,
  goalText: row.goal_text ?? null,
  targetCount: row.target_count == null ? null : Number(row.target_count),
  completedCount: row.completed_count == null ? null : Number(row.completed_count),
  energyBefore: row.energy_before == null ? null : Number(row.energy_before),
  energyAfter: row.energy_after == null ? null : Number(row.energy_after),
  interruptionCount: Number(row.interruption_count ?? 0),
  distractionNotes: row.distraction_notes ?? [],
  environmentLabel: row.environment_label ?? null,
  createdAt: row.created_at,
});

const mapPlan = (row: any): PlanSnapshot => ({
  id: row.id,
  planDate: row.plan_date,
  studyMinutes: Number(row.study_minutes ?? 0),
  revisionMinutes: Number(row.revision_minutes ?? 0),
  classMinutes: Number(row.class_minutes ?? 0),
  assignmentCount: Number(row.assignment_count ?? 0),
  priorityLabels: row.priority_labels ?? [],
  healthScore: row.health_score == null ? null : Number(row.health_score),
  createdAt: row.created_at,
});

const mapCapture = (row: any): CaptureAnalysis => ({
  id: row.id,
  captureKind: row.capture_kind,
  sourceName: row.source_name ?? null,
  summary: row.summary ?? null,
  analysis: (row.analysis ?? {}) as Record<string, unknown>,
  createdAt: row.created_at,
});

type IntelligenceContextValue = {
  mistakes: StudyMistake[];
  questionResults: PaperQuestionResult[];
  outcomes: SessionOutcome[];
  planSnapshots: PlanSnapshot[];
  captures: CaptureAnalysis[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addMistake: (
    value: Omit<StudyMistake, "id" | "resolved" | "correctStreak" | "nextReviewAt" | "lastReviewedAt" | "createdAt"> & { nextReviewAt?: string | null },
  ) => Promise<string>;
  reviewMistake: (id: string, correct: boolean) => Promise<void>;
  addQuestionResult: (value: Omit<PaperQuestionResult, "id" | "createdAt">) => Promise<string>;
  addOutcome: (value: Omit<SessionOutcome, "id" | "createdAt">) => Promise<string>;
  savePlanSnapshot: (value: Omit<PlanSnapshot, "id" | "createdAt">) => Promise<void>;
  saveCaptureAnalysis: (kind: string, sourceName: string | null, summary: string | null, analysis: Record<string, unknown>) => Promise<string>;
  saveRemoteActiveState: (snapshot: Record<string, unknown>, deviceLabel?: string | null) => Promise<void>;
  readRemoteActiveState: () => Promise<RemoteActiveStudyState>;
  clearRemoteActiveState: () => Promise<void>;
};

const IntelligenceContext = createContext<IntelligenceContextValue | null>(null);

export function IntelligenceProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnline, syncTick } = useOffline();
  const [state, setState] = useState<Cache>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(async (next: Cache) => {
    if (user) await writeJson(cacheKey(user.id, "intelligence-v1"), next);
  }, [user]);

  const loadCache = useCallback(async () => {
    if (!user) {
      setState(EMPTY);
      setLoading(false);
      return;
    }
    const cached = await readJson<Cache>(cacheKey(user.id, "intelligence-v1"), EMPTY);
    setState({ ...EMPTY, ...cached });
    setLoading(false);
  }, [user]);

  const syncQueue = useCallback(async () => {
    if (!user || !isOnline) return;
    const queue = await queuedMutationsFor(user.id, KINDS);
    for (const item of queue) {
      try {
        const payload = item.payload;
        let mutationError: any = null;
        if (item.kind === "mistake_upsert") {
          ({ error: mutationError } = await supabase.from("study_mistakes").upsert(payload, { onConflict: "id" }));
        } else if (item.kind === "question_result_upsert") {
          ({ error: mutationError } = await supabase.from("paper_question_results").upsert(payload, { onConflict: "id" }));
        } else if (item.kind === "outcome_upsert") {
          ({ error: mutationError } = await supabase.from("study_session_outcomes").upsert(payload, { onConflict: "id" }));
        } else if (item.kind === "plan_snapshot_upsert") {
          ({ error: mutationError } = await supabase.from("plan_snapshots").upsert(payload, { onConflict: "user_id,plan_date" }));
        } else if (item.kind === "capture_analysis_insert") {
          ({ error: mutationError } = await supabase.from("capture_analyses").upsert(payload, { onConflict: "id" }));
        }
        if (mutationError) throw mutationError;
        await removeQueuedMutation(item.id);
      } catch {
        break;
      }
    }
  }, [isOnline, user]);

  const refresh = useCallback(async () => {
    if (!user) {
      setState(EMPTY);
      setLoading(false);
      return;
    }
    setError(null);
    if (!isOnline) {
      await loadCache();
      return;
    }

    setLoading(true);
    try {
      await syncQueue();
      const [mistakesResult, questionsResult, outcomesResult, plansResult, capturesResult] = await Promise.all([
        supabase.from("study_mistakes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000),
        supabase.from("paper_question_results").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(2000),
        supabase.from("study_session_outcomes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000),
        supabase.from("plan_snapshots").select("*").eq("user_id", user.id).order("plan_date", { ascending: false }).limit(180),
        supabase.from("capture_analyses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      ]);
      const queryError = mistakesResult.error ?? questionsResult.error ?? outcomesResult.error ?? plansResult.error ?? capturesResult.error;
      if (queryError) throw queryError;

      const next: Cache = {
        mistakes: (mistakesResult.data ?? []).map(mapMistake),
        questionResults: (questionsResult.data ?? []).map(mapQuestion),
        outcomes: (outcomesResult.data ?? []).map(mapOutcome),
        planSnapshots: (plansResult.data ?? []).map(mapPlan),
        captures: (capturesResult.data ?? []).map(mapCapture),
      };
      setState(next);
      await persist(next);
    } catch {
      await loadCache();
      setError("Offline intelligence data is shown. New entries will sync when internet returns.");
    } finally {
      setLoading(false);
    }
  }, [isOnline, loadCache, persist, syncQueue, user]);

  useEffect(() => {
    if (!authLoading) loadCache().then(() => refresh());
  }, [authLoading, loadCache, refresh]);

  useEffect(() => {
    if (isOnline && user) syncQueue().then(() => refresh());
  }, [isOnline, refresh, syncQueue, syncTick, user]);

  const addMistake = useCallback(async (
    value: Omit<StudyMistake, "id" | "resolved" | "correctStreak" | "nextReviewAt" | "lastReviewedAt" | "createdAt"> & { nextReviewAt?: string | null },
  ) => {
    if (!user) throw new Error("Sign in first.");
    const id = makeUuid();
    const now = new Date().toISOString();
    const local: StudyMistake = {
      id,
      ...value,
      resolved: false,
      correctStreak: 0,
      nextReviewAt: value.nextReviewAt ?? new Date(Date.now() + 2 * 86400000).toISOString(),
      lastReviewedAt: null,
      createdAt: now,
    };
    const next = { ...state, mistakes: [local, ...state.mistakes] };
    setState(next);
    await persist(next);
    await enqueueMutation({
      userId: user.id,
      kind: "mistake_upsert",
      payload: {
        id,
        user_id: user.id,
        subject_name: local.subjectName,
        topic_name: local.topicName,
        source: local.source,
        source_label: local.sourceLabel,
        question_ref: local.questionRef,
        mistake_type: local.mistakeType,
        note: local.note,
        confidence: local.confidence,
        resolved: false,
        correct_streak: 0,
        next_review_at: local.nextReviewAt,
        last_reviewed_at: null,
        created_at: now,
        updated_at: now,
      },
    });
    if (isOnline) syncQueue().catch(() => undefined);
    return id;
  }, [isOnline, persist, state, syncQueue, user]);

  const reviewMistake = useCallback(async (id: string, correct: boolean) => {
    if (!user) return;
    const current = state.mistakes.find(item => item.id === id);
    if (!current) return;
    const streak = correct ? current.correctStreak + 1 : 0;
    const resolved = correct && streak >= 3;
    const days = correct ? Math.min(30, Math.max(3, 2 ** Math.min(5, streak))) : 1;
    const now = new Date().toISOString();
    const updated: StudyMistake = {
      ...current,
      correctStreak: streak,
      resolved,
      nextReviewAt: resolved ? null : new Date(Date.now() + days * 86400000).toISOString(),
      lastReviewedAt: now,
    };
    const next = { ...state, mistakes: state.mistakes.map(item => item.id === id ? updated : item) };
    setState(next);
    await persist(next);
    await enqueueMutation({
      userId: user.id,
      kind: "mistake_upsert",
      payload: {
        id,
        user_id: user.id,
        subject_name: updated.subjectName,
        topic_name: updated.topicName,
        source: updated.source,
        source_label: updated.sourceLabel,
        question_ref: updated.questionRef,
        mistake_type: updated.mistakeType,
        note: updated.note,
        confidence: updated.confidence,
        resolved: updated.resolved,
        correct_streak: updated.correctStreak,
        next_review_at: updated.nextReviewAt,
        last_reviewed_at: updated.lastReviewedAt,
        created_at: updated.createdAt,
        updated_at: now,
      },
    });
    if (isOnline) syncQueue().catch(() => undefined);
  }, [isOnline, persist, state, syncQueue, user]);

  const addQuestionResult = useCallback(async (value: Omit<PaperQuestionResult, "id" | "createdAt">) => {
    if (!user) throw new Error("Sign in first.");
    const id = makeUuid();
    const createdAt = new Date().toISOString();
    const local: PaperQuestionResult = { id, ...value, createdAt };
    const next = { ...state, questionResults: [local, ...state.questionResults] };
    setState(next);
    await persist(next);
    await enqueueMutation({
      userId: user.id,
      kind: "question_result_upsert",
      payload: {
        id,
        user_id: user.id,
        session_id: value.sessionId,
        subject_name: value.subjectName,
        topic_name: value.topicName,
        paper_label: value.paperLabel,
        question_no: value.questionNo,
        marks_awarded: value.marksAwarded,
        marks_total: value.marksTotal,
        duration_seconds: value.durationSeconds,
        confidence: value.confidence,
        mistake_type: value.mistakeType,
        difficulty_rating: value.difficultyRating,
        created_at: createdAt,
      },
    });
    if (value.marksTotal > 0 && value.marksAwarded / value.marksTotal < 0.7) {
      await addMistake({
        subjectName: value.subjectName,
        topicName: value.topicName,
        source: "Paper",
        sourceLabel: value.paperLabel,
        questionRef: value.questionNo,
        mistakeType: value.mistakeType ?? "Concept gap",
        note: `${value.marksAwarded}/${value.marksTotal} marks`,
        confidence: value.confidence,
      });
    }
    if (isOnline) syncQueue().catch(() => undefined);
    return id;
  }, [addMistake, isOnline, persist, state, syncQueue, user]);

  const addOutcome = useCallback(async (value: Omit<SessionOutcome, "id" | "createdAt">) => {
    if (!user) throw new Error("Sign in first.");
    const id = makeUuid();
    const createdAt = new Date().toISOString();
    const local: SessionOutcome = { id, ...value, createdAt };
    const next = { ...state, outcomes: [local, ...state.outcomes] };
    setState(next);
    await persist(next);
    await enqueueMutation({
      userId: user.id,
      kind: "outcome_upsert",
      payload: {
        id,
        user_id: user.id,
        session_id: value.sessionId,
        goal_text: value.goalText,
        target_count: value.targetCount,
        completed_count: value.completedCount,
        energy_before: value.energyBefore,
        energy_after: value.energyAfter,
        interruption_count: value.interruptionCount,
        distraction_notes: value.distractionNotes,
        environment_label: value.environmentLabel,
        created_at: createdAt,
        updated_at: createdAt,
      },
    });
    if (isOnline) syncQueue().catch(() => undefined);
    return id;
  }, [isOnline, persist, state, syncQueue, user]);

  const savePlanSnapshot = useCallback(async (value: Omit<PlanSnapshot, "id" | "createdAt">) => {
    if (!user) return;
    const existing = state.planSnapshots.find(item => item.planDate === value.planDate);
    const local: PlanSnapshot = {
      id: existing?.id ?? makeUuid(),
      ...value,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    const next = {
      ...state,
      planSnapshots: [local, ...state.planSnapshots.filter(item => item.planDate !== value.planDate)].sort((a, b) => b.planDate.localeCompare(a.planDate)),
    };
    setState(next);
    await persist(next);
    await enqueueMutation({
      userId: user.id,
      kind: "plan_snapshot_upsert",
      payload: {
        id: local.id,
        user_id: user.id,
        plan_date: local.planDate,
        study_minutes: local.studyMinutes,
        revision_minutes: local.revisionMinutes,
        class_minutes: local.classMinutes,
        assignment_count: local.assignmentCount,
        priority_labels: local.priorityLabels,
        health_score: local.healthScore,
        created_at: local.createdAt,
      },
    });
    if (isOnline) syncQueue().catch(() => undefined);
  }, [isOnline, persist, state, syncQueue, user]);

  const saveCaptureAnalysis = useCallback(async (
    kind: string,
    sourceName: string | null,
    summary: string | null,
    analysis: Record<string, unknown>,
  ) => {
    if (!user) throw new Error("Sign in first.");
    const id = makeUuid();
    const createdAt = new Date().toISOString();
    const local: CaptureAnalysis = { id, captureKind: kind, sourceName, summary, analysis, createdAt };
    const next = { ...state, captures: [local, ...state.captures] };
    setState(next);
    await persist(next);
    await enqueueMutation({
      userId: user.id,
      kind: "capture_analysis_insert",
      payload: { id, user_id: user.id, capture_kind: kind, source_name: sourceName, summary, analysis, created_at: createdAt },
    });
    if (isOnline) syncQueue().catch(() => undefined);
    return id;
  }, [isOnline, persist, state, syncQueue, user]);

  const saveRemoteActiveState = useCallback(async (snapshot: Record<string, unknown>, deviceLabel: string | null = null) => {
    if (!user || !isOnline) return;
    const { error: saveError } = await supabase.from("active_study_state").upsert(
      { user_id: user.id, snapshot, device_label: deviceLabel, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (saveError) throw saveError;
  }, [isOnline, user]);

  const readRemoteActiveState = useCallback(async (): Promise<RemoteActiveStudyState> => {
    if (!user || !isOnline) return null;
    const { data, error: readError } = await supabase
      .from("active_study_state")
      .select("snapshot,device_label,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError || !data) return null;
    return {
      snapshot: (data.snapshot ?? {}) as Record<string, unknown>,
      deviceLabel: data.device_label ?? null,
      updatedAt: data.updated_at,
    };
  }, [isOnline, user]);

  const clearRemoteActiveState = useCallback(async () => {
    if (!user || !isOnline) return;
    const { error: clearError } = await supabase.from("active_study_state").delete().eq("user_id", user.id);
    if (clearError) throw clearError;
  }, [isOnline, user]);

  const value = useMemo<IntelligenceContextValue>(() => ({
    ...state,
    loading,
    error,
    refresh,
    addMistake,
    reviewMistake,
    addQuestionResult,
    addOutcome,
    savePlanSnapshot,
    saveCaptureAnalysis,
    saveRemoteActiveState,
    readRemoteActiveState,
    clearRemoteActiveState,
  }), [
    addMistake,
    addOutcome,
    addQuestionResult,
    clearRemoteActiveState,
    error,
    loading,
    readRemoteActiveState,
    refresh,
    reviewMistake,
    saveCaptureAnalysis,
    savePlanSnapshot,
    saveRemoteActiveState,
    state,
  ]);

  return <IntelligenceContext.Provider value={value}>{children}</IntelligenceContext.Provider>;
}

export function useIntelligence() {
  const value = useContext(IntelligenceContext);
  if (!value) throw new Error("useIntelligence must be used inside IntelligenceProvider.");
  return value;
}
