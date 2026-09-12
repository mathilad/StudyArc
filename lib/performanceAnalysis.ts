import type { PaperQuestionResult } from "../context/IntelligenceContext";
import type { TestMark } from "../context/StudentContext";

export type PerformanceLevel = "No data" | "Foundation" | "Building" | "Developing" | "Strong" | "Very strong";

export function levelForScore(score: number | null): PerformanceLevel {
  if (score == null) return "No data";
  if (score < 40) return "Foundation";
  if (score < 55) return "Building";
  if (score < 70) return "Developing";
  if (score < 85) return "Strong";
  return "Very strong";
}

export function testPercent(mark: TestMark): number | null {
  const got = (mark.mcqScore ?? 0) + (mark.essayScore ?? 0);
  const total = (mark.mcqTotal ?? 0) + (mark.essayTotal ?? 0);
  return total > 0 ? Math.max(0, Math.min(100, Math.round(got / total * 100))) : null;
}

export function questionAccuracy(rows: PaperQuestionResult[]): number | null {
  const valid = rows.filter(row => row.marksTotal > 0);
  const possible = valid.reduce((sum, row) => sum + row.marksTotal, 0);
  if (possible <= 0) return null;
  const got = valid.reduce((sum, row) => sum + row.marksAwarded, 0);
  return Math.max(0, Math.min(100, Math.round(got / possible * 100)));
}

export function combinedPerformance(testMarks: TestMark[], questionResults: PaperQuestionResult[]): number | null {
  const tests = testMarks.map(testPercent).filter((value): value is number => value != null);
  const testAverage = tests.length ? Math.round(tests.reduce((a, b) => a + b, 0) / tests.length) : null;
  const scanAverage = questionAccuracy(questionResults);
  if (testAverage != null && scanAverage != null) return Math.round(testAverage * .55 + scanAverage * .45);
  return testAverage ?? scanAverage;
}

export function recallDaysForScore(score: number): number {
  if (score < 40) return 1;
  if (score < 55) return 2;
  if (score < 70) return 4;
  if (score < 85) return 7;
  return 14;
}

export function weeklyAdjustmentForScore(score: number): number {
  if (score < 40) return 180;
  if (score < 55) return 120;
  if (score < 70) return 60;
  if (score < 85) return 30;
  return -30;
}

export function subjectPerformance(testMarks: TestMark[], questionResults: PaperQuestionResult[]) {
  const subjects = [...new Set([
    ...testMarks.map(row => row.subjectName),
    ...questionResults.map(row => row.subjectName),
  ])];
  return subjects.map(subjectName => {
    const tests = testMarks.filter(row => row.subjectName === subjectName);
    const questions = questionResults.filter(row => row.subjectName === subjectName);
    const score = combinedPerformance(tests, questions);
    const topics = new Map<string, { got: number; total: number; count: number }>();
    questions.forEach(row => {
      if (row.marksTotal <= 0) return;
      const current = topics.get(row.topicName) ?? { got: 0, total: 0, count: 0 };
      current.got += row.marksAwarded;
      current.total += row.marksTotal;
      current.count += 1;
      topics.set(row.topicName, current);
    });
    const topicRows = [...topics.entries()].map(([topicName, value]) => ({
      topicName,
      attempts: value.count,
      score: value.total > 0 ? Math.round(value.got / value.total * 100) : null,
    })).sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
    const weakFromTests = tests.flatMap(row => row.weakTopics);
    const weakTopics = [...new Set([
      ...topicRows.filter(row => row.score != null && row.score < 70).map(row => row.topicName),
      ...weakFromTests,
    ])].slice(0, 6);
    return {
      subjectName,
      score,
      level: levelForScore(score),
      testCount: tests.length,
      questionCount: questions.length,
      weakTopics,
      topicRows,
    };
  }).sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
}
