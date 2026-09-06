import type { AppSettings } from "../context/AppConfigContext";
import type { SubtopicCoverage, TopicProgress } from "../context/StudentContext";
import type { StudySession } from "../context/StudyContext";

export type ReadinessBreakdown = {
  examReadiness: number;
  syllabusCoverage: number;
  paperPractice: number;
  revisionConsistency: number;
  topicMastery: number;
  recentRevision: number;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const daysAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;

export function calculateReadiness(
  subjects: string[],
  progress: TopicProgress[],
  coverage: SubtopicCoverage[],
  sessions: StudySession[],
  settings: AppSettings,
): ReadinessBreakdown {
  const subjectSet = new Set(subjects);
  const relevantProgress = progress.filter(p => subjectSet.has(p.subjectName));
  const relevantCoverage = coverage.filter(c => subjectSet.has(c.subjectName) && c.source === "Manual");
  const relevantSessions = sessions.filter(s => subjectSet.has(s.subjectName));

  const syllabusCoverage = relevantProgress.length
    ? relevantProgress.reduce((sum, p) => sum + p.coverage, 0) / relevantProgress.length
    : relevantCoverage.length ? relevantCoverage.filter(c => c.covered).length / relevantCoverage.length * 100 : 0;

  const topicMastery = relevantProgress.length
    ? relevantProgress.reduce((sum, p) => sum + p.knowledge * .35 + p.memory * .35 + p.performance * .30, 0) / relevantProgress.length
    : 0;

  const paperSessions30 = relevantSessions.filter(s => daysAgo(s.startedAt) <= 30 && ["Past Papers", "Paper Discussion", "Paper Review", "Paper Correction"].includes(s.studyType));
  const paperMinutes30 = paperSessions30.reduce((sum, s) => sum + s.durationSeconds / 60, 0);
  const paperPractice = clamp(paperMinutes30 / (12 * 60) * 100);

  const revisionDays = new Set(relevantSessions.filter(s => daysAgo(s.startedAt) <= 14 && ["Revision", "Paper Review", "Paper Correction"].includes(s.studyType)).map(s => new Date(s.startedAt).toDateString())).size;
  const revisionConsistency = clamp(revisionDays / 10 * 100);

  const recentMinutes = relevantSessions.filter(s => daysAgo(s.startedAt) <= 7 && ["Revision", "Past Papers", "Paper Review", "Paper Correction"].includes(s.studyType)).reduce((sum, s) => sum + s.durationSeconds / 60, 0);
  const recentRevision = clamp(recentMinutes / (6 * 60) * 100);

  const w = settings.readinessWeights;
  const examReadiness = clamp(
    syllabusCoverage * w.coverage +
    paperPractice * w.paperPractice +
    topicMastery * w.topicMastery +
    revisionConsistency * w.consistency +
    recentRevision * w.recentRevision,
  );

  return { examReadiness, syllabusCoverage: clamp(syllabusCoverage), paperPractice, revisionConsistency, topicMastery: clamp(topicMastery), recentRevision };
}
