import * as ImagePicker from "expo-image-picker";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { findTopic, type SubjectName } from "../data/subjects";
import { cacheKey, enqueueMutation, makeUuid, queuedMutationsFor, readJson, removeQueuedMutation, writeJson } from "../lib/offlineStore";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";

export type StudentProfile = {
  fullName: string;
  school: string;
  district: string;
  examYear: number | null;
  wakeTime: string;
  sleepTime: string;
  selfStudyHours: number;
  subjectChoices: string[];
  avatarUrl: string | null;
  onboardingComplete: boolean;
};

export type ClassSchedule = {
  id: string;
  subjectName: string;
  title: string;
  classType: "Theory" | "Revision" | "Paper" | "Extra Class";
  deliveryMode: "Physical" | "Online";
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  preReviewMinutes: number;
  travelMinutes: number;
};

export type TestMark = {
  id: string;
  subjectName: string;
  testDate: string;
  title: string;
  mcqScore: number | null;
  mcqTotal: number | null;
  essayScore: number | null;
  essayTotal: number | null;
  mcqPercent: number | null;
  essayPercent: number | null;
  weakTopics: string[];
};

export type TopicProgress = {
  id: string;
  subjectName: string;
  topicName: string;
  coverage: number;
  knowledge: number;
  memory: number;
  performance: number;
  lastStudiedAt: string | null;
  nextRecallAt: string | null;
};

export type SubtopicCoverage = {
  id: string;
  subjectName: string;
  topicName: string;
  subtopicName: string;
  covered: boolean;
  source: "Manual" | "Class";
  coveredAt: string | null;
};

export type DailyReview = {
  id: string;
  reviewDate: string;
  pagesStudied: number;
  pagesRevised: number;
  completedBlocks: number;
  dayRating: number;
  attentionTopics: string[];
  createdAt: string;
};

export type NewClass = Omit<ClassSchedule, "id">;
export type NewTestMark = Omit<TestMark, "id" | "mcqPercent" | "essayPercent">;
export type TopicProgressInput = Omit<TopicProgress, "id">;
export type DailyReviewInput = Omit<DailyReview, "id" | "createdAt">;

const DEFAULT_PROFILE: StudentProfile = {
  fullName: "",
  school: "",
  district: "",
  examYear: null,
  wakeTime: "06:00",
  sleepTime: "22:30",
  selfStudyHours: 3,
  subjectChoices: [],
  avatarUrl: null,
  onboardingComplete: false,
};

type StudentCache = {
  profile: StudentProfile;
  classes: ClassSchedule[];
  testMarks: TestMark[];
  topicProgress: TopicProgress[];
  subtopicCoverage: SubtopicCoverage[];
  dailyReviews: DailyReview[];
};

type StudentContextValue = {
  profile: StudentProfile;
  classes: ClassSchedule[];
  testMarks: TestMark[];
  topicProgress: TopicProgress[];
  subtopicCoverage: SubtopicCoverage[];
  dailyReviews: DailyReview[];
  todayReview: DailyReview | null;
  loading: boolean;
  error: string | null;
  refreshStudentData: () => Promise<void>;
  saveProfile: (updates: Partial<StudentProfile>) => Promise<void>;
  completeOnboarding: (profile: StudentProfile) => Promise<void>;
  addClass: (value: NewClass) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  addTestMark: (value: NewTestMark) => Promise<void>;
  deleteTestMark: (id: string) => Promise<void>;
  upsertTopicProgress: (value: TopicProgressInput) => Promise<void>;
  setSubtopicCovered: (subjectName: string, topicName: string, subtopicName: string, covered: boolean, source?: "Manual" | "Class") => Promise<void>;
  setSubtopicsCovered: (subjectName: string, topicName: string, subtopicNames: string[], covered: boolean, source?: "Manual" | "Class") => Promise<void>;
  setLessonCovered: (subjectName: string, topicName: string, covered: boolean, source?: "Manual" | "Class") => Promise<void>;
  saveDailyReview: (value: DailyReviewInput) => Promise<void>;
  uploadAvatar: () => Promise<string | null>;
};

const StudentContext = createContext<StudentContextValue | null>(null);
const KINDS = [
  "student_profile_upsert",
  "class_upsert",
  "class_delete",
  "test_mark_upsert",
  "test_mark_delete",
  "topic_progress_upsert",
  "syllabus_coverage_upsert",
  "daily_review_upsert",
];

const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const percent = (score: number | null, total: number | null) => score == null || total == null || total <= 0 ? null : Math.max(0, Math.min(100, score / total * 100));
const mapProfile = (r: any): StudentProfile => ({
  fullName: r?.full_name ?? "",
  school: r?.school ?? "",
  district: r?.district ?? "",
  examYear: r?.exam_year ?? null,
  wakeTime: r?.wake_time ?? "06:00",
  sleepTime: r?.sleep_time ?? "22:30",
  selfStudyHours: Number(r?.self_study_hours ?? 3),
  subjectChoices: r?.subject_choices ?? [],
  avatarUrl: r?.avatar_url ?? null,
  onboardingComplete: Boolean(r?.onboarding_complete),
});

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnline, syncTick, refreshConnectivity } = useOffline();
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [testMarks, setTestMarks] = useState<TestMark[]>([]);
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [subtopicCoverage, setSubtopicCoverage] = useState<SubtopicCoverage[]>([]);
  const [dailyReviews, setDailyReviews] = useState<DailyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(async (
    p = profile,
    c = classes,
    t = testMarks,
    tp = topicProgress,
    sc = subtopicCoverage,
    r = dailyReviews,
  ) => {
    if (!user) return;
    await writeJson(cacheKey(user.id, "student"), {
      profile: p,
      classes: c,
      testMarks: t,
      topicProgress: tp,
      subtopicCoverage: sc,
      dailyReviews: r,
    } satisfies StudentCache);
  }, [classes, dailyReviews, profile, subtopicCoverage, testMarks, topicProgress, user]);

  const loadCache = useCallback(async () => {
    if (!user) return;
    const x = await readJson<StudentCache>(cacheKey(user.id, "student"), {
      profile: DEFAULT_PROFILE,
      classes: [],
      testMarks: [],
      topicProgress: [],
      subtopicCoverage: [],
      dailyReviews: [],
    });
    setProfile(x.profile ?? DEFAULT_PROFILE);
    setClasses(x.classes ?? []);
    setTestMarks(x.testMarks ?? []);
    setTopicProgress(x.topicProgress ?? []);
    setSubtopicCoverage(x.subtopicCoverage ?? []);
    setDailyReviews(x.dailyReviews ?? []);
    setLoading(false);
  }, [user]);

  const refreshStudentData = useCallback(async () => {
    if (!user) {
      setProfile(DEFAULT_PROFILE);
      setClasses([]);
      setTestMarks([]);
      setTopicProgress([]);
      setSubtopicCoverage([]);
      setDailyReviews([]);
      setLoading(false);
      return;
    }
    setError(null);
    if (!isOnline) {
      await loadCache();
      return;
    }
    try {
      const [pr, cr, tr, tpr, scr, rr] = await Promise.all([
        supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("class_schedules").select("*").eq("user_id", user.id).order("day_of_week").order("start_time"),
        supabase.from("test_marks").select("*").eq("user_id", user.id).order("test_date", { ascending: false }),
        supabase.from("topic_progress").select("*").eq("user_id", user.id),
        supabase.from("syllabus_coverage").select("*").eq("user_id", user.id),
        supabase.from("daily_reviews").select("*").eq("user_id", user.id).order("review_date", { ascending: false }).limit(90),
      ]);
      if (pr.error) throw pr.error;
      if (cr.error) throw cr.error;
      if (tr.error) throw tr.error;
      if (tpr.error) throw tpr.error;
      if (scr.error) throw scr.error;
      if (rr.error) throw rr.error;

      let nextProfile = pr.data ? mapProfile(pr.data) : DEFAULT_PROFILE;
      if (!pr.data) {
        const { data, error: e } = await supabase.from("student_profiles").insert({ user_id: user.id }).select("*").single();
        if (e) throw e;
        nextProfile = mapProfile(data);
      }

      const nextClasses: ClassSchedule[] = (cr.data ?? []).map((r: any) => ({
        id: r.id,
        subjectName: r.subject_name,
        title: r.title,
        classType: r.class_type,
        deliveryMode: r.delivery_mode,
        dayOfWeek: r.day_of_week,
        startTime: r.start_time,
        endTime: r.end_time,
        preReviewMinutes: r.pre_review_minutes,
        travelMinutes: r.travel_minutes,
      }));

      const nextTests: TestMark[] = (tr.data ?? []).map((r: any) => {
        const mcqScore = r.mcq_score == null ? null : Number(r.mcq_score);
        const mcqTotal = r.mcq_total == null ? null : Number(r.mcq_total);
        const essayScore = r.essay_score == null ? null : Number(r.essay_score);
        const essayTotal = r.essay_total == null ? null : Number(r.essay_total);
        return {
          id: r.id,
          subjectName: r.subject_name,
          testDate: r.test_date,
          title: r.title,
          mcqScore,
          mcqTotal,
          essayScore,
          essayTotal,
          mcqPercent: r.mcq_percent == null ? percent(mcqScore, mcqTotal) : Number(r.mcq_percent),
          essayPercent: r.essay_percent == null ? percent(essayScore, essayTotal) : Number(r.essay_percent),
          weakTopics: r.weak_topics ?? [],
        };
      });

      const nextTopics: TopicProgress[] = (tpr.data ?? []).map((r: any) => ({
        id: r.id,
        subjectName: r.subject_name,
        topicName: r.topic_name,
        coverage: Number(r.coverage ?? 0),
        knowledge: Number(r.knowledge ?? 0),
        memory: Number(r.memory ?? 0),
        performance: Number(r.performance ?? 0),
        lastStudiedAt: r.last_studied_at,
        nextRecallAt: r.next_recall_at,
      }));

      const nextCoverage: SubtopicCoverage[] = (scr.data ?? []).map((r: any) => ({
        id: r.id,
        subjectName: r.subject_name,
        topicName: r.topic_name,
        subtopicName: r.subtopic_name,
        covered: Boolean(r.covered),
        source: r.source === "Class" ? "Class" : "Manual",
        coveredAt: r.covered_at,
      }));

      const nextReviews: DailyReview[] = (rr.data ?? []).map((r: any) => ({
        id: r.id,
        reviewDate: r.review_date,
        pagesStudied: Number(r.pages_studied ?? 0),
        pagesRevised: Number(r.pages_revised ?? 0),
        completedBlocks: Number(r.completed_blocks ?? 0),
        dayRating: Number(r.day_rating ?? 3),
        attentionTopics: r.attention_topics ?? [],
        createdAt: r.created_at,
      }));

      setProfile(nextProfile);
      setClasses(nextClasses);
      setTestMarks(nextTests);
      setTopicProgress(nextTopics);
      setSubtopicCoverage(nextCoverage);
      setDailyReviews(nextReviews);
      await writeJson(cacheKey(user.id, "student"), {
        profile: nextProfile,
        classes: nextClasses,
        testMarks: nextTests,
        topicProgress: nextTopics,
        subtopicCoverage: nextCoverage,
        dailyReviews: nextReviews,
      } satisfies StudentCache);
    } catch {
      await loadCache();
      setError("Offline copy shown. Changes are saved locally and will sync automatically.");
    } finally {
      setLoading(false);
    }
  }, [isOnline, loadCache, user]);

  const syncQueue = useCallback(async () => {
    if (!user || !isOnline) return;
    const q = await queuedMutationsFor(user.id, KINDS);
    for (const item of q) {
      try {
        let e: any = null;
        const p = item.payload;
        if (item.kind === "student_profile_upsert") ({ error: e } = await supabase.from("student_profiles").upsert(p, { onConflict: "user_id" }));
        else if (item.kind === "class_upsert") ({ error: e } = await supabase.from("class_schedules").upsert(p, { onConflict: "id" }));
        else if (item.kind === "class_delete") ({ error: e } = await supabase.from("class_schedules").delete().eq("id", p.id).eq("user_id", user.id));
        else if (item.kind === "test_mark_upsert") ({ error: e } = await supabase.from("test_marks").upsert(p, { onConflict: "id" }));
        else if (item.kind === "test_mark_delete") ({ error: e } = await supabase.from("test_marks").delete().eq("id", p.id).eq("user_id", user.id));
        else if (item.kind === "topic_progress_upsert") ({ error: e } = await supabase.from("topic_progress").upsert(p, { onConflict: "user_id,subject_name,topic_name" }));
        else if (item.kind === "syllabus_coverage_upsert") ({ error: e } = await supabase.from("syllabus_coverage").upsert(p, { onConflict: "user_id,subject_name,topic_name,subtopic_name" }));
        else if (item.kind === "daily_review_upsert") ({ error: e } = await supabase.from("daily_reviews").upsert(p, { onConflict: "user_id,review_date" }));
        if (e) throw e;
        await removeQueuedMutation(item.id);
      } catch {
        break;
      }
    }
  }, [isOnline, user]);

  useEffect(() => {
    if (!authLoading) loadCache().then(() => refreshStudentData());
  }, [authLoading, loadCache, refreshStudentData]);

  useEffect(() => {
    if (isOnline && user) syncQueue().then(() => refreshStudentData());
  }, [isOnline, refreshStudentData, syncQueue, syncTick, user]);

  const saveProfile = useCallback(async (updates: Partial<StudentProfile>) => {
    if (!user) throw new Error("You must be signed in.");
    const merged = { ...profile, ...updates };
    setProfile(merged);
    await persist(merged, classes, testMarks, topicProgress, subtopicCoverage, dailyReviews);
    await enqueueMutation({
      userId: user.id,
      kind: "student_profile_upsert",
      payload: {
        user_id: user.id,
        full_name: merged.fullName,
        school: merged.school || null,
        district: merged.district || null,
        exam_year: merged.examYear,
        wake_time: merged.wakeTime,
        sleep_time: merged.sleepTime,
        self_study_hours: merged.selfStudyHours,
        subject_choices: merged.subjectChoices,
        avatar_url: merged.avatarUrl,
        onboarding_complete: merged.onboardingComplete,
        updated_at: new Date().toISOString(),
      },
    });
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classes, dailyReviews, isOnline, persist, profile, refreshConnectivity, subtopicCoverage, syncQueue, testMarks, topicProgress, user]);

  const completeOnboarding = useCallback(async (v: StudentProfile) => saveProfile({ ...v, onboardingComplete: true }), [saveProfile]);

  const addClass = useCallback(async (v: NewClass) => {
    if (!user) throw new Error("You must be signed in.");
    const local = { ...v, id: makeUuid(), travelMinutes: v.deliveryMode === "Physical" ? 90 : 0 };
    const next = [...classes, local].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    setClasses(next);
    await persist(profile, next, testMarks, topicProgress, subtopicCoverage, dailyReviews);
    await enqueueMutation({
      userId: user.id,
      kind: "class_upsert",
      payload: {
        id: local.id,
        user_id: user.id,
        subject_name: local.subjectName,
        title: local.title,
        class_type: local.classType,
        delivery_mode: local.deliveryMode,
        day_of_week: local.dayOfWeek,
        start_time: local.startTime,
        end_time: local.endTime,
        pre_review_minutes: local.preReviewMinutes,
        travel_minutes: local.travelMinutes,
      },
    });
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classes, dailyReviews, isOnline, persist, profile, refreshConnectivity, subtopicCoverage, syncQueue, testMarks, topicProgress, user]);

  const deleteClass = useCallback(async (id: string) => {
    if (!user) return;
    const next = classes.filter(x => x.id !== id);
    setClasses(next);
    await persist(profile, next, testMarks, topicProgress, subtopicCoverage, dailyReviews);
    await enqueueMutation({ userId: user.id, kind: "class_delete", payload: { id } });
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classes, dailyReviews, isOnline, persist, profile, refreshConnectivity, subtopicCoverage, syncQueue, testMarks, topicProgress, user]);

  const addTestMark = useCallback(async (v: NewTestMark) => {
    if (!user) throw new Error("You must be signed in.");
    const local: TestMark = {
      ...v,
      id: makeUuid(),
      mcqPercent: percent(v.mcqScore, v.mcqTotal),
      essayPercent: percent(v.essayScore, v.essayTotal),
    };
    const next = [local, ...testMarks];
    setTestMarks(next);
    await persist(profile, classes, next, topicProgress, subtopicCoverage, dailyReviews);
    await enqueueMutation({
      userId: user.id,
      kind: "test_mark_upsert",
      payload: {
        id: local.id,
        user_id: user.id,
        subject_name: local.subjectName,
        test_date: local.testDate,
        title: local.title,
        mcq_score: local.mcqScore,
        mcq_total: local.mcqTotal,
        essay_score: local.essayScore,
        essay_total: local.essayTotal,
        mcq_percent: local.mcqPercent,
        essay_percent: local.essayPercent,
        weak_topics: local.weakTopics,
      },
    });
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classes, dailyReviews, isOnline, persist, profile, refreshConnectivity, subtopicCoverage, syncQueue, testMarks, topicProgress, user]);

  const deleteTestMark = useCallback(async (id: string) => {
    if (!user) return;
    const next = testMarks.filter(x => x.id !== id);
    setTestMarks(next);
    await persist(profile, classes, next, topicProgress, subtopicCoverage, dailyReviews);
    await enqueueMutation({ userId: user.id, kind: "test_mark_delete", payload: { id } });
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classes, dailyReviews, isOnline, persist, profile, refreshConnectivity, subtopicCoverage, syncQueue, testMarks, topicProgress, user]);

  const upsertTopicProgress = useCallback(async (v: TopicProgressInput) => {
    if (!user) throw new Error("You must be signed in.");
    const existing = topicProgress.find(x => x.subjectName === v.subjectName && x.topicName === v.topicName);
    const local = { ...v, id: existing?.id ?? makeUuid() };
    const next = [...topicProgress.filter(x => !(x.subjectName === v.subjectName && x.topicName === v.topicName)), local];
    setTopicProgress(next);
    await persist(profile, classes, testMarks, next, subtopicCoverage, dailyReviews);
    await enqueueMutation({
      userId: user.id,
      kind: "topic_progress_upsert",
      payload: {
        user_id: user.id,
        subject_name: v.subjectName,
        topic_name: v.topicName,
        coverage: v.coverage,
        knowledge: v.knowledge,
        memory: v.memory,
        performance: v.performance,
        last_studied_at: v.lastStudiedAt,
        next_recall_at: v.nextRecallAt,
        updated_at: new Date().toISOString(),
      },
    });
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classes, dailyReviews, isOnline, persist, profile, refreshConnectivity, subtopicCoverage, syncQueue, testMarks, topicProgress, user]);

  const setSubtopicsCovered = useCallback(async (
    subjectName: string,
    topicName: string,
    subtopicNames: string[],
    covered: boolean,
    source: "Manual" | "Class" = "Manual",
  ) => {
    if (!user) throw new Error("You must be signed in.");
    if (!subtopicNames.length) return;
    const topic = findTopic(subjectName as SubjectName, topicName);
    if (!topic) return;
    const validNames = subtopicNames.filter(name => topic.subtopics.includes(name));
    if (!validNames.length) return;
    const now = new Date().toISOString();
    const changed: SubtopicCoverage[] = validNames.map(subtopicName => {
      const existing = subtopicCoverage.find(x => x.subjectName === subjectName && x.topicName === topicName && x.subtopicName === subtopicName);
      return {
        id: existing?.id ?? makeUuid(),
        subjectName,
        topicName,
        subtopicName,
        covered,
        source,
        coveredAt: covered ? now : null,
      };
    });
    const names = new Set(validNames);
    const nextCoverage = [
      ...subtopicCoverage.filter(x => !(x.subjectName === subjectName && x.topicName === topicName && names.has(x.subtopicName))),
      ...changed,
    ];
    const total = Math.max(1, topic.subtopics.length);
    const coveredCount = topic.subtopics.filter(subtopic => nextCoverage.some(x => x.subjectName === subjectName && x.topicName === topicName && x.subtopicName === subtopic && x.covered)).length;
    const coverageScore = Math.round(coveredCount / total * 100);
    const currentProgress = topicProgress.find(x => x.subjectName === subjectName && x.topicName === topicName);
    const nextProgressRow: TopicProgress = {
      id: currentProgress?.id ?? makeUuid(),
      subjectName,
      topicName,
      coverage: coverageScore,
      knowledge: currentProgress?.knowledge ?? 0,
      memory: currentProgress?.memory ?? 0,
      performance: currentProgress?.performance ?? 0,
      lastStudiedAt: currentProgress?.lastStudiedAt ?? null,
      nextRecallAt: currentProgress?.nextRecallAt ?? null,
    };
    const nextProgress = [...topicProgress.filter(x => !(x.subjectName === subjectName && x.topicName === topicName)), nextProgressRow];
    setSubtopicCoverage(nextCoverage);
    setTopicProgress(nextProgress);
    await persist(profile, classes, testMarks, nextProgress, nextCoverage, dailyReviews);
    for (const row of changed) {
      await enqueueMutation({
        userId: user.id,
        kind: "syllabus_coverage_upsert",
        payload: { id: row.id, user_id: user.id, subject_name: subjectName, topic_name: topicName, subtopic_name: row.subtopicName, covered, source, covered_at: row.coveredAt, updated_at: now },
      });
    }
    await enqueueMutation({
      userId: user.id,
      kind: "topic_progress_upsert",
      payload: { user_id: user.id, subject_name: subjectName, topic_name: topicName, coverage: coverageScore, knowledge: nextProgressRow.knowledge, memory: nextProgressRow.memory, performance: nextProgressRow.performance, last_studied_at: nextProgressRow.lastStudiedAt, next_recall_at: nextProgressRow.nextRecallAt, updated_at: now },
    });
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classes, dailyReviews, isOnline, persist, profile, refreshConnectivity, subtopicCoverage, syncQueue, testMarks, topicProgress, user]);

  const setSubtopicCovered = useCallback(async (
    subjectName: string,
    topicName: string,
    subtopicName: string,
    covered: boolean,
    source: "Manual" | "Class" = "Manual",
  ) => setSubtopicsCovered(subjectName, topicName, [subtopicName], covered, source), [setSubtopicsCovered]);

  const setLessonCovered = useCallback(async (
    subjectName: string,
    topicName: string,
    covered: boolean,
    source: "Manual" | "Class" = "Manual",
  ) => {
    const topic = findTopic(subjectName as SubjectName, topicName);
    if (!topic) return;
    await setSubtopicsCovered(subjectName, topicName, topic.subtopics, covered, source);
  }, [setSubtopicsCovered]);

  const saveDailyReview = useCallback(async (v: DailyReviewInput) => {
    if (!user) throw new Error("You must be signed in.");
    const existing = dailyReviews.find(x => x.reviewDate === v.reviewDate);
    const local: DailyReview = { ...v, id: existing?.id ?? makeUuid(), createdAt: existing?.createdAt ?? new Date().toISOString() };
    const next = [local, ...dailyReviews.filter(x => x.reviewDate !== v.reviewDate)].sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));
    setDailyReviews(next);
    await persist(profile, classes, testMarks, topicProgress, subtopicCoverage, next);
    await enqueueMutation({
      userId: user.id,
      kind: "daily_review_upsert",
      payload: {
        id: local.id,
        user_id: user.id,
        review_date: local.reviewDate,
        pages_studied: local.pagesStudied,
        pages_revised: local.pagesRevised,
        completed_blocks: local.completedBlocks,
        day_rating: local.dayRating,
        attention_topics: local.attentionTopics,
        updated_at: new Date().toISOString(),
      },
    });
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classes, dailyReviews, isOnline, persist, profile, refreshConnectivity, subtopicCoverage, syncQueue, testMarks, topicProgress, user]);

  const uploadAvatar = useCallback(async () => {
    if (!user) throw new Error("You must be signed in.");
    if (!isOnline) throw new Error("Profile photo upload needs internet. Other profile changes still work offline.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: .8 });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    const response = await fetch(asset.uri);
    const bytes = await response.arrayBuffer();
    const ext = asset.fileName?.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: e } = await supabase.storage.from("avatars").upload(path, bytes, { contentType: asset.mimeType ?? "image/jpeg", upsert: true });
    if (e) throw e;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await saveProfile({ avatarUrl: data.publicUrl });
    return data.publicUrl;
  }, [isOnline, saveProfile, user]);

  const todayReview = useMemo(() => dailyReviews.find(x => x.reviewDate === dateKey()) ?? null, [dailyReviews]);
  const value = useMemo<StudentContextValue>(() => ({
    profile,
    classes,
    testMarks,
    topicProgress,
    subtopicCoverage,
    dailyReviews,
    todayReview,
    loading,
    error,
    refreshStudentData,
    saveProfile,
    completeOnboarding,
    addClass,
    deleteClass,
    addTestMark,
    deleteTestMark,
    upsertTopicProgress,
    setSubtopicCovered,
    setSubtopicsCovered,
    setLessonCovered,
    saveDailyReview,
    uploadAvatar,
  }), [profile, classes, testMarks, topicProgress, subtopicCoverage, dailyReviews, todayReview, loading, error, refreshStudentData, saveProfile, completeOnboarding, addClass, deleteClass, addTestMark, deleteTestMark, upsertTopicProgress, setSubtopicCovered, setSubtopicsCovered, setLessonCovered, saveDailyReview, uploadAvatar]);

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudent() {
  const v = useContext(StudentContext);
  if (!v) throw new Error("useStudent must be used inside StudentProvider.");
  return v;
}
