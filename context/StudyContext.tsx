import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cacheKey, enqueueMutation, makeUuid, queuedMutationsFor, readJson, removeQueuedMutation, writeJson } from "../lib/offlineStore";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";

export type StudyType = "Tute Questions" | "Past Papers" | "Study Session" | "Revision";
export type PaperSection = "MCQ" | "Essay" | "Full Paper";
export type SavedLap = { id: string; number: number; durationMilliseconds: number; totalMilliseconds: number };
export type PastPaperHistory = { id: string; subjectName: string; paperYear: number; paperSection: PaperSection; attempts: number };
export type StudySession = {
  id: string; subjectName: string; topicName: string; studyType: StudyType; startedAt: string; durationSeconds: number;
  focusRating: number | null; understandingRating: number | null; paperYear: number | null; paperSection: PaperSection | null;
  attemptNo: number | null; sessionNote: string | null; laps: SavedLap[];
};
type NewLap = { number: number; duration: number; total: number };
type NewStudySession = { subjectName: string; topicName: string; studyType: StudyType; startedAt: string; durationSeconds: number; paperYear?: number | null; paperSection?: PaperSection | null; attemptNo?: number | null; laps?: NewLap[] };
type SessionAnalysis = { focusRating?: number | null; understandingRating?: number | null; sessionNote?: string | null };
type StudyCache = { sessions: StudySession[]; paperHistory: PastPaperHistory[] };

type StudyContextValue = {
  sessions: StudySession[]; paperHistory: PastPaperHistory[]; todaySeconds: number; totalSeconds: number;
  subjectSeconds: Record<string, number>; topicSeconds: Record<string, number>; loading: boolean; error: string | null;
  addSession: (session: NewStudySession) => Promise<string>;
  updateSessionAnalysis: (sessionId: string, analysis: SessionAnalysis) => Promise<void>;
  refreshSessions: () => Promise<void>; deleteSession: (sessionId: string) => Promise<void>;
  getPaperAttemptCount: (subject: string, year: number, section?: PaperSection) => number;
  addManualPastPaperAttempt: (subject: string, year: number, section: PaperSection) => Promise<void>;
  setManualPastPaperAttempts: (subject: string, year: number, section: PaperSection, attempts: number) => Promise<void>;
};

const StudyContext = createContext<StudyContextValue | null>(null);
const STUDY_KINDS = ["study_session_upsert", "study_session_analysis", "study_session_delete", "paper_history_set"];
const isToday = (iso: string) => { const date = new Date(iso), now = new Date(); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate(); };
const mapSession = (row: any): StudySession => ({
  id: row.id, subjectName: row.subject_name, topicName: row.topic_name, studyType: row.study_type, startedAt: row.started_at,
  durationSeconds: Number(row.duration_seconds ?? 0), focusRating: row.focus_rating, understandingRating: row.understanding_rating,
  paperYear: row.paper_year == null ? null : Number(row.paper_year), paperSection: row.paper_section, attemptNo: row.attempt_no == null ? null : Number(row.attempt_no),
  sessionNote: row.session_note, laps: [...(row.study_laps ?? [])].sort((a:any,b:any)=>a.lap_number-b.lap_number).map((lap:any)=>({ id:lap.id, number:lap.lap_number, durationMilliseconds:Number(lap.duration_milliseconds), totalMilliseconds:Number(lap.total_milliseconds) })),
});

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnline, syncTick, refreshConnectivity } = useOffline();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [paperHistory, setPaperHistory] = useState<PastPaperHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(async (nextSessions: StudySession[], nextHistory: PastPaperHistory[]) => {
    if (!user) return;
    await writeJson(cacheKey(user.id, "study"), { sessions: nextSessions, paperHistory: nextHistory } satisfies StudyCache);
  }, [user]);

  const loadCache = useCallback(async () => {
    if (!user) return;
    const cached = await readJson<StudyCache>(cacheKey(user.id, "study"), { sessions: [], paperHistory: [] });
    setSessions(cached.sessions ?? []); setPaperHistory(cached.paperHistory ?? []); setLoading(false);
  }, [user]);

  const refreshSessions = useCallback(async () => {
    if (!user) { setSessions([]); setPaperHistory([]); setLoading(false); return; }
    setError(null);
    if (!isOnline) { await loadCache(); return; }
    try {
      const { data, error: queryError } = await supabase.from("study_sessions").select(`id, subject_name, topic_name, study_type, started_at, duration_seconds, focus_rating, understanding_rating, paper_year, paper_section, attempt_no, session_note, study_laps (id, lap_number, duration_milliseconds, total_milliseconds)`).eq("user_id", user.id).order("started_at", { ascending: false });
      if (queryError) throw queryError;
      const { data: historyRows, error: historyError } = await supabase.from("past_paper_history").select("id, subject_name, paper_year, paper_section, attempts").eq("user_id", user.id);
      if (historyError) throw historyError;
      const nextSessions = (data ?? []).map(mapSession);
      const nextHistory = (historyRows ?? []).map((row:any)=>({ id:row.id, subjectName:row.subject_name, paperYear:Number(row.paper_year), paperSection:row.paper_section as PaperSection, attempts:Number(row.attempts??0) }));
      setSessions(nextSessions); setPaperHistory(nextHistory); await persist(nextSessions, nextHistory);
    } catch (e) {
      await loadCache();
      setError("Offline copy shown. New changes will sync automatically when internet returns.");
    } finally { setLoading(false); }
  }, [isOnline, loadCache, persist, user]);

  const touchTopicProgressRemote = useCallback(async (subjectName: string, topicName: string, studyType: StudyType) => {
    if (!user || subjectName === "Quick Study" || topicName === "General") return;
    const { data, error: readError } = await supabase.from("topic_progress").select("coverage,knowledge,memory,performance").eq("user_id", user.id).eq("subject_name", subjectName).eq("topic_name", topicName).maybeSingle();
    if (readError) throw readError;
    const now = new Date(); const current = data ?? { coverage:0, knowledge:0, memory:0, performance:0 };
    const coverage = Number(current.coverage ?? 0);
    const knowledge = Math.min(100, Number(current.knowledge??0) + (studyType === "Revision" ? 2 : 3));
    const gain = studyType === "Revision" ? (subjectName === "Biology" ? 8 : 6) : subjectName === "Biology" ? 4 : 2;
    const memory = Math.min(100, Math.max(Number(current.memory??0), studyType === "Revision" ? 48 : 38) + gain);
    const performance = Math.min(100, Number(current.performance??0) + (studyType === "Past Papers" ? 5 : 1));
    const recallDays = subjectName === "Biology" ? memory < 45 ? 1 : memory < 65 ? 3 : memory < 82 ? 7 : 14 : memory < 45 ? 2 : memory < 70 ? 5 : memory < 85 ? 10 : 21;
    await supabase.from("topic_progress").upsert({ user_id:user.id, subject_name:subjectName, topic_name:topicName, coverage, knowledge, memory, performance, last_studied_at:now.toISOString(), next_recall_at:new Date(now.getTime()+recallDays*86400000).toISOString(), updated_at:now.toISOString() }, { onConflict:"user_id,subject_name,topic_name" });
  }, [user]);

  const syncStudyQueue = useCallback(async () => {
    if (!user || !isOnline) return;
    const queue = await queuedMutationsFor(user.id, STUDY_KINDS);
    for (const item of queue) {
      try {
        if (item.kind === "study_session_upsert") {
          const { sessionRow, lapRows, touch } = item.payload;
          const { error: upsertError } = await supabase.from("study_sessions").upsert(sessionRow, { onConflict: "id" }); if (upsertError) throw upsertError;
          if (lapRows?.length) { const { error: lapError } = await supabase.from("study_laps").upsert(lapRows, { onConflict: "id" }); if (lapError) throw lapError; }
          if (touch) await touchTopicProgressRemote(touch.subjectName, touch.topicName, touch.studyType);
        } else if (item.kind === "study_session_analysis") {
          const { error: e } = await supabase.from("study_sessions").update(item.payload.updates).eq("id", item.payload.sessionId).eq("user_id", user.id); if (e) throw e;
        } else if (item.kind === "study_session_delete") {
          const { error: e } = await supabase.from("study_sessions").delete().eq("id", item.payload.sessionId).eq("user_id", user.id); if (e) throw e;
        } else if (item.kind === "paper_history_set") {
          const p = item.payload;
          if (p.attempts <= 0) { const { error:e } = await supabase.from("past_paper_history").delete().eq("user_id",user.id).eq("subject_name",p.subject).eq("paper_year",p.year).eq("paper_section",p.section); if(e) throw e; }
          else { const { error:e } = await supabase.from("past_paper_history").upsert({ user_id:user.id, subject_name:p.subject, paper_year:p.year, paper_section:p.section, attempts:p.attempts, updated_at:new Date().toISOString() }, { onConflict:"user_id,subject_name,paper_year,paper_section" }); if(e) throw e; }
        }
        await removeQueuedMutation(item.id);
      } catch { break; }
    }
  }, [isOnline, touchTopicProgressRemote, user]);

  useEffect(() => { if (!authLoading) { loadCache().then(()=>refreshSessions()); } }, [authLoading, loadCache, refreshSessions]);
  useEffect(() => { if (isOnline && user) syncStudyQueue().then(()=>refreshSessions()); }, [isOnline, refreshSessions, syncStudyQueue, syncTick, user]);

  const addSession = useCallback(async (session: NewStudySession) => {
    if (!user) throw new Error("You must be signed in before saving a study session.");
    const id = makeUuid();
    const local: StudySession = { id, subjectName:session.subjectName, topicName:session.topicName, studyType:session.studyType, startedAt:session.startedAt, durationSeconds:Math.max(0,Math.floor(session.durationSeconds)), focusRating:null, understandingRating:null, paperYear:session.paperYear??null, paperSection:session.paperSection??null, attemptNo:session.attemptNo??null, sessionNote:null, laps:(session.laps??[]).map(l=>({id:makeUuid(), number:l.number, durationMilliseconds:Math.max(0,Math.floor(l.duration)), totalMilliseconds:Math.max(0,Math.floor(l.total))})) };
    const next = [local, ...sessions]; setSessions(next); await persist(next, paperHistory);
    await enqueueMutation({ userId:user.id, kind:"study_session_upsert", payload:{ sessionRow:{ id, user_id:user.id, subject_name:local.subjectName, topic_name:local.topicName, study_type:local.studyType, started_at:local.startedAt, duration_seconds:local.durationSeconds, paper_year:local.paperYear, paper_section:local.paperSection, attempt_no:local.attemptNo }, lapRows:local.laps.map(l=>({ id:l.id, session_id:id, user_id:user.id, lap_number:l.number, duration_milliseconds:l.durationMilliseconds, total_milliseconds:l.totalMilliseconds })), touch:{ subjectName:local.subjectName, topicName:local.topicName, studyType:local.studyType } } });
    if (isOnline) syncStudyQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
    return id;
  }, [isOnline, paperHistory, persist, refreshConnectivity, sessions, syncStudyQueue, user]);

  const updateSessionAnalysis = useCallback(async (sessionId:string, analysis:SessionAnalysis) => {
    if(!user) throw new Error("You must be signed in.");
    const updates:any={}; if(analysis.focusRating!==undefined)updates.focus_rating=analysis.focusRating;if(analysis.understandingRating!==undefined)updates.understanding_rating=analysis.understandingRating;if(analysis.sessionNote!==undefined)updates.session_note=analysis.sessionNote;
    const next=sessions.map(s=>s.id===sessionId?{...s,focusRating:analysis.focusRating!==undefined?analysis.focusRating:s.focusRating,understandingRating:analysis.understandingRating!==undefined?analysis.understandingRating:s.understandingRating,sessionNote:analysis.sessionNote!==undefined?analysis.sessionNote:s.sessionNote}:s); setSessions(next);await persist(next,paperHistory);
    await enqueueMutation({userId:user.id,kind:"study_session_analysis",payload:{sessionId,updates}}); if(isOnline)syncStudyQueue().catch(()=>undefined); refreshConnectivity().catch(()=>undefined);
  },[isOnline,paperHistory,persist,refreshConnectivity,sessions,syncStudyQueue,user]);

  const deleteSession=useCallback(async(sessionId:string)=>{if(!user)throw new Error("You must be signed in.");const next=sessions.filter(s=>s.id!==sessionId);setSessions(next);await persist(next,paperHistory);await enqueueMutation({userId:user.id,kind:"study_session_delete",payload:{sessionId}});if(isOnline)await syncStudyQueue();refreshConnectivity().catch(()=>undefined);},[isOnline,paperHistory,persist,refreshConnectivity,sessions,syncStudyQueue,user]);

  const totalSeconds=useMemo(()=>sessions.reduce((t,s)=>t+s.durationSeconds,0),[sessions]);
  const todaySeconds=useMemo(()=>sessions.reduce((t,s)=>t+(isToday(s.startedAt)?s.durationSeconds:0),0),[sessions]);
  const subjectSeconds=useMemo(()=>sessions.reduce<Record<string,number>>((a,s)=>{a[s.subjectName]=(a[s.subjectName]??0)+s.durationSeconds;return a},{}),[sessions]);
  const topicSeconds=useMemo(()=>sessions.reduce<Record<string,number>>((a,s)=>{const k=`${s.subjectName}::${s.topicName}`;a[k]=(a[k]??0)+s.durationSeconds;return a},{}),[sessions]);
  const getPaperAttemptCount=useCallback((subject:string,year:number,section?:PaperSection)=>sessions.filter(s=>s.studyType==="Past Papers"&&s.subjectName===subject&&s.paperYear===year&&(!section||s.paperSection===section)).length+paperHistory.filter(r=>r.subjectName===subject&&r.paperYear===year&&(!section||r.paperSection===section)).reduce((sum,r)=>sum+r.attempts,0),[sessions,paperHistory]);

  const setManualPastPaperAttempts=useCallback(async(subject:string,year:number,section:PaperSection,attempts:number)=>{if(!user)throw new Error("You must be signed in.");const safe=Math.max(0,Math.floor(attempts));const existing=paperHistory.find(r=>r.subjectName===subject&&r.paperYear===year&&r.paperSection===section);let next=paperHistory.filter(r=>!(r.subjectName===subject&&r.paperYear===year&&r.paperSection===section));if(safe>0)next=[...next,{id:existing?.id??makeUuid(),subjectName:subject,paperYear:year,paperSection:section,attempts:safe}];setPaperHistory(next);await persist(sessions,next);await enqueueMutation({userId:user.id,kind:"paper_history_set",payload:{subject,year,section,attempts:safe}});if(isOnline)syncStudyQueue().catch(()=>undefined);refreshConnectivity().catch(()=>undefined);},[isOnline,paperHistory,persist,refreshConnectivity,sessions,syncStudyQueue,user]);
  const addManualPastPaperAttempt=useCallback(async(subject:string,year:number,section:PaperSection)=>{const existing=paperHistory.find(r=>r.subjectName===subject&&r.paperYear===year&&r.paperSection===section);await setManualPastPaperAttempts(subject,year,section,(existing?.attempts??0)+1)},[paperHistory,setManualPastPaperAttempts]);

  const value=useMemo<StudyContextValue>(()=>({sessions,paperHistory,todaySeconds,totalSeconds,subjectSeconds,topicSeconds,loading,error,addSession,updateSessionAnalysis,refreshSessions,deleteSession,getPaperAttemptCount,addManualPastPaperAttempt,setManualPastPaperAttempts}),[sessions,paperHistory,todaySeconds,totalSeconds,subjectSeconds,topicSeconds,loading,error,addSession,updateSessionAnalysis,refreshSessions,deleteSession,getPaperAttemptCount,addManualPastPaperAttempt,setManualPastPaperAttempts]);
  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}
export function useStudy(){const context=useContext(StudyContext);if(!context)throw new Error("useStudy must be used inside StudyProvider.");return context;}
