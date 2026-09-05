import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ALStream } from "../data/alStreams";
import { setRuntimePaperTopicResults } from "../lib/academicRuntime";
import { cacheKey, enqueueMutation, makeUuid, queuedMutationsFor, readJson, removeQueuedMutation, writeJson } from "../lib/offlineStore";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";

export type Exam = { id: string; name: string; examType: string; startsOn: string | null; endsOn: string | null; isMainExam: boolean };
export type ExamComponent = { id: string; examId: string; subjectName: string; componentName: string; examAt: string | null };
export type Assignment = { id: string; sourceClassId: string | null; title: string; subjectName: string; topicName: string | null; dueAt: string | null; estimatedMinutes: number; completed: boolean };
export type PaperTopicResult = { id: string; subjectName: string; topicName: string; paperLabel: string | null; performancePercent: number | null; weaknessPercent: number | null; source: "Manual" | "Paper" | "Test"; recordedAt: string };

type Cache = { stream: ALStream | null; exams: Exam[]; components: ExamComponent[]; assignments: Assignment[]; paperTopicResults: PaperTopicResult[] };
const DEFAULT_CACHE: Cache = { stream: null, exams: [], components: [], assignments: [], paperTopicResults: [] };
const KINDS = ["academic_stream_set", "exam_upsert", "exam_component_upsert", "assignment_upsert", "paper_topic_result_upsert"];

const AcademicContext = createContext<{
  stream: ALStream | null;
  exams: Exam[];
  examComponents: ExamComponent[];
  assignments: Assignment[];
  paperTopicResults: PaperTopicResult[];
  loading: boolean;
  setStream: (stream: ALStream) => Promise<void>;
  addExam: (value: Omit<Exam, "id"> & { id?: string }) => Promise<string>;
  addExamComponent: (value: Omit<ExamComponent, "id"> & { id?: string }) => Promise<string>;
  addAssignment: (value: Omit<Assignment, "id"> & { id?: string }) => Promise<string>;
  setAssignmentCompleted: (id: string, completed: boolean) => Promise<void>;
  addPaperTopicResult: (value: Omit<PaperTopicResult, "id" | "recordedAt">) => Promise<string>;
  refreshAcademicData: () => Promise<void>;
} | null>(null);

const mapExam = (r: any): Exam => ({ id: r.id, name: r.name, examType: r.exam_type, startsOn: r.starts_on, endsOn: r.ends_on, isMainExam: Boolean(r.is_main_exam) });
const mapComponent = (r: any): ExamComponent => ({ id: r.id, examId: r.exam_id, subjectName: r.subject_name, componentName: r.component_name, examAt: r.exam_at });
const mapAssignment = (r: any): Assignment => ({ id: r.id, sourceClassId: r.source_class_id, title: r.title, subjectName: r.subject_name, topicName: r.topic_name, dueAt: r.due_at, estimatedMinutes: Number(r.estimated_minutes ?? 60), completed: Boolean(r.completed) });
const mapPaperTopic = (r: any): PaperTopicResult => ({ id: r.id, subjectName: r.subject_name, topicName: r.topic_name, paperLabel: r.paper_label, performancePercent: r.performance_percent == null ? null : Number(r.performance_percent), weaknessPercent: r.weakness_percent == null ? null : Number(r.weakness_percent), source: r.source, recordedAt: r.recorded_at });

export function AcademicProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnline, syncTick } = useOffline();
  const [state, setState] = useState<Cache>(DEFAULT_CACHE);
  const [loading, setLoading] = useState(true);

  // Planner functions are synchronous. Keep their runtime weakness input in step
  // with this context before descendant screens generate a plan.
  setRuntimePaperTopicResults(state.paperTopicResults);

  const persist = useCallback(async (next: Cache) => { if (user) await writeJson(cacheKey(user.id, "academic"), next); }, [user]);
  const loadCache = useCallback(async () => {
    if (!user) { setState(DEFAULT_CACHE); setLoading(false); return; }
    const next = await readJson<Cache>(cacheKey(user.id, "academic"), DEFAULT_CACHE);
    setState({ ...DEFAULT_CACHE, ...next });
    setLoading(false);
  }, [user]);

  const syncQueue = useCallback(async () => {
    if (!user || !isOnline) return;
    const queue = await queuedMutationsFor(user.id, KINDS);
    for (const item of queue) {
      try {
        const p = item.payload;
        let error: any = null;
        if (item.kind === "academic_stream_set") ({ error } = await supabase.from("student_profiles").update({ stream: p.stream, updated_at: new Date().toISOString() }).eq("user_id", user.id));
        else if (item.kind === "exam_upsert") ({ error } = await supabase.from("exams").upsert(p, { onConflict: "id" }));
        else if (item.kind === "exam_component_upsert") ({ error } = await supabase.from("exam_components").upsert(p, { onConflict: "id" }));
        else if (item.kind === "assignment_upsert") ({ error } = await supabase.from("assignments").upsert(p, { onConflict: "id" }));
        else if (item.kind === "paper_topic_result_upsert") ({ error } = await supabase.from("paper_topic_results").upsert(p, { onConflict: "id" }));
        if (error) throw error;
        await removeQueuedMutation(item.id);
      } catch {
        break;
      }
    }
  }, [isOnline, user]);

  const refreshAcademicData = useCallback(async () => {
    if (!user) { setState(DEFAULT_CACHE); setLoading(false); return; }
    if (!isOnline) { await loadCache(); return; }
    try {
      const [profileResult, examsResult, componentsResult, assignmentsResult, paperResults] = await Promise.all([
        supabase.from("student_profiles").select("stream").eq("user_id", user.id).maybeSingle(),
        supabase.from("exams").select("*").eq("user_id", user.id).order("starts_on", { ascending: true }),
        supabase.from("exam_components").select("*").eq("user_id", user.id).order("exam_at", { ascending: true }),
        supabase.from("assignments").select("*").eq("user_id", user.id).order("due_at", { ascending: true }),
        supabase.from("paper_topic_results").select("*").eq("user_id", user.id).order("recorded_at", { ascending: false }).limit(500),
      ]);
      if (profileResult.error || examsResult.error || componentsResult.error || assignmentsResult.error || paperResults.error) throw profileResult.error ?? examsResult.error ?? componentsResult.error ?? assignmentsResult.error ?? paperResults.error;
      const next: Cache = {
        stream: (profileResult.data?.stream as ALStream | null) ?? null,
        exams: (examsResult.data ?? []).map(mapExam),
        components: (componentsResult.data ?? []).map(mapComponent),
        assignments: (assignmentsResult.data ?? []).map(mapAssignment),
        paperTopicResults: (paperResults.data ?? []).map(mapPaperTopic),
      };
      setState(next);
      await persist(next);
    } catch {
      await loadCache();
    } finally {
      setLoading(false);
    }
  }, [isOnline, loadCache, persist, user]);

  useEffect(() => { if (!authLoading) loadCache().then(() => refreshAcademicData()); }, [authLoading, loadCache, refreshAcademicData]);
  useEffect(() => { if (isOnline && user) syncQueue().then(() => refreshAcademicData()); }, [isOnline, refreshAcademicData, syncQueue, syncTick, user]);

  const setStream = useCallback(async (stream: ALStream) => {
    if (!user) throw new Error("You must be signed in.");
    const next = { ...state, stream };
    setState(next);
    await persist(next);
    await enqueueMutation({ userId: user.id, kind: "academic_stream_set", payload: { stream } });
    if (isOnline) syncQueue().catch(() => undefined);
  }, [isOnline, persist, state, syncQueue, user]);

  const addExam = useCallback(async (value: Omit<Exam, "id"> & { id?: string }) => {
    if (!user) throw new Error("You must be signed in.");
    const local: Exam = { ...value, id: value.id ?? makeUuid() };
    const next = { ...state, exams: [...state.exams.filter(x => x.id !== local.id), local] };
    setState(next);
    await persist(next);
    await enqueueMutation({ userId: user.id, kind: "exam_upsert", payload: { id: local.id, user_id: user.id, name: local.name, exam_type: local.examType, starts_on: local.startsOn, ends_on: local.endsOn, is_main_exam: local.isMainExam, updated_at: new Date().toISOString() } });
    if (isOnline) syncQueue().catch(() => undefined);
    return local.id;
  }, [isOnline, persist, state, syncQueue, user]);

  const addExamComponent = useCallback(async (value: Omit<ExamComponent, "id"> & { id?: string }) => {
    if (!user) throw new Error("You must be signed in.");
    const local: ExamComponent = { ...value, id: value.id ?? makeUuid() };
    const next = { ...state, components: [...state.components.filter(x => x.id !== local.id), local] };
    setState(next);
    await persist(next);
    await enqueueMutation({ userId: user.id, kind: "exam_component_upsert", payload: { id: local.id, user_id: user.id, exam_id: local.examId, subject_name: local.subjectName, component_name: local.componentName, exam_at: local.examAt } });
    if (isOnline) syncQueue().catch(() => undefined);
    return local.id;
  }, [isOnline, persist, state, syncQueue, user]);

  const addAssignment = useCallback(async (value: Omit<Assignment, "id"> & { id?: string }) => {
    if (!user) throw new Error("You must be signed in.");
    const local: Assignment = { ...value, id: value.id ?? makeUuid() };
    const next = { ...state, assignments: [...state.assignments.filter(x => x.id !== local.id), local] };
    setState(next);
    await persist(next);
    await enqueueMutation({ userId: user.id, kind: "assignment_upsert", payload: { id: local.id, user_id: user.id, source_class_id: local.sourceClassId, title: local.title, subject_name: local.subjectName, topic_name: local.topicName, due_at: local.dueAt, estimated_minutes: local.estimatedMinutes, completed: local.completed, updated_at: new Date().toISOString() } });
    if (isOnline) syncQueue().catch(() => undefined);
    return local.id;
  }, [isOnline, persist, state, syncQueue, user]);

  const setAssignmentCompleted = useCallback(async (id: string, completed: boolean) => {
    const current = state.assignments.find(x => x.id === id);
    if (!current) return;
    await addAssignment({ ...current, completed });
  }, [addAssignment, state.assignments]);

  const addPaperTopicResult = useCallback(async (value: Omit<PaperTopicResult, "id" | "recordedAt">) => {
    if (!user) throw new Error("You must be signed in.");
    const local: PaperTopicResult = { ...value, id: makeUuid(), recordedAt: new Date().toISOString() };
    const next = { ...state, paperTopicResults: [local, ...state.paperTopicResults] };
    setState(next);
    await persist(next);
    await enqueueMutation({ userId: user.id, kind: "paper_topic_result_upsert", payload: { id: local.id, user_id: user.id, subject_name: local.subjectName, topic_name: local.topicName, paper_label: local.paperLabel, performance_percent: local.performancePercent, weakness_percent: local.weaknessPercent, source: local.source, recorded_at: local.recordedAt } });
    if (isOnline) syncQueue().catch(() => undefined);
    return local.id;
  }, [isOnline, persist, state, syncQueue, user]);

  const value = useMemo(() => ({ stream: state.stream, exams: state.exams, examComponents: state.components, assignments: state.assignments, paperTopicResults: state.paperTopicResults, loading, setStream, addExam, addExamComponent, addAssignment, setAssignmentCompleted, addPaperTopicResult, refreshAcademicData }), [addAssignment, addExam, addExamComponent, addPaperTopicResult, loading, refreshAcademicData, setAssignmentCompleted, setStream, state]);
  return <AcademicContext.Provider value={value}>{children}</AcademicContext.Provider>;
}

export function useAcademic() {
  const value = useContext(AcademicContext);
  if (!value) throw new Error("useAcademic must be used inside AcademicProvider.");
  return value;
}
