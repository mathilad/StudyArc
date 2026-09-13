export type NormalizedPaperQuestion = {
  pageIndex: number;
  questionNo: string;
  questionPart: string | null;
  questionNoSource: "explicit" | "inherited" | "unknown";
  topicName: string | null;
  subtopicName: string | null;
  lessonConfidence: number | null;
  marksAwarded: number | null;
  marksTotal: number | null;
  markSource: string;
  markConfidence: number | null;
  teacherMarkColor: string | null;
  correctIndicator: boolean | null;
  answerSummary: string | null;
  feedback: string | null;
  confidence: number | null;
  mistakeType: string | null;
  difficultyRating: number | null;
};

const n = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const unit = (value: unknown): number | null => {
  const valueNumber = n(value);
  if (valueNumber == null) return null;
  if (valueNumber > 1 && valueNumber <= 5) return Math.max(0, Math.min(1, valueNumber / 5));
  if (valueNumber > 5 && valueNumber <= 100) return Math.max(0, Math.min(1, valueNumber / 100));
  return Math.max(0, Math.min(1, valueNumber));
};

const boolOrNull = (value: unknown): boolean | null => value === true ? true : value === false ? false : null;
const textOrNull = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;

function uniqueStrings(...values: unknown[][]) {
  const seen = new Set<string>();
  const out: string[] = [];
  values.flat().forEach(value => {
    const text = String(value ?? "").trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(text);
  });
  return out;
}

function normalizedMarkSource(value: unknown) {
  const raw = String(value ?? "none").trim().toLowerCase().replace(/\s+/g, "_");
  const allowed = new Set(["red_numeric", "red_tick", "red_cross", "written_total", "teacher_numeric", "reference_grading", "explicit_fraction", "none"]);
  return allowed.has(raw) ? raw : raw || "none";
}

export function toFivePointConfidence(value: unknown): number | null {
  const u = unit(value);
  if (u == null) return null;
  return Math.max(1, Math.min(5, Math.round(u * 4) + 1));
}

export function normalizePaperAnalysis(raw: Record<string, any>, pageCount: number) {
  const sourceRows = Array.isArray(raw?.questionResults) ? raw.questionResults : [];
  let lastQuestionNo = "";
  const rows: NormalizedPaperQuestion[] = sourceRows.map((row: any, index: number) => {
    const pageIndex = Math.max(1, Math.min(Math.max(1, pageCount), Math.round(n(row?.pageIndex) ?? 1)));
    const explicitQuestion = String(row?.questionNo ?? "").trim();
    let questionNo = explicitQuestion;
    let questionNoSource: NormalizedPaperQuestion["questionNoSource"] = explicitQuestion ? "explicit" : "unknown";
    if (!questionNo && lastQuestionNo) {
      questionNo = lastQuestionNo;
      questionNoSource = "inherited";
    }
    if (!questionNo) questionNo = `?${index + 1}`;
    if (explicitQuestion) lastQuestionNo = explicitQuestion;

    const teacherMarkColor = textOrNull(row?.teacherMarkColor);
    const red = teacherMarkColor?.toLowerCase().includes("red") === true;
    const markSource = normalizedMarkSource(row?.markSource);
    let marksAwarded = n(row?.marksAwarded);
    const marksTotal = n(row?.marksTotal);
    const correctIndicator = boolOrNull(row?.correctIndicator);
    let markConfidence = unit(row?.markConfidence ?? row?.confidence);

    if (markConfidence != null) {
      if (red) markConfidence += 0.12;
      if (["red_numeric", "teacher_numeric", "explicit_fraction", "written_total"].includes(markSource)) markConfidence += 0.1;
      if (questionNoSource === "inherited") markConfidence -= 0.04;
      markConfidence = Math.max(0, Math.min(1, markConfidence));
    }

    // Only turn a tick/cross into a numeric mark for an explicitly one-mark item.
    if (marksAwarded == null && marksTotal === 1 && correctIndicator != null && red) {
      marksAwarded = correctIndicator ? 1 : 0;
      markConfidence = Math.max(markConfidence ?? 0, 0.82);
    }
    if (marksAwarded != null && marksTotal != null) marksAwarded = Math.max(0, Math.min(marksTotal, marksAwarded));

    return {
      pageIndex,
      questionNo,
      questionPart: textOrNull(row?.questionPart),
      questionNoSource,
      topicName: textOrNull(row?.topicName),
      subtopicName: textOrNull(row?.subtopicName),
      lessonConfidence: unit(row?.lessonConfidence),
      marksAwarded,
      marksTotal,
      markSource,
      markConfidence,
      teacherMarkColor,
      correctIndicator,
      answerSummary: textOrNull(row?.answerSummary),
      feedback: textOrNull(row?.feedback),
      confidence: unit(row?.confidence),
      mistakeType: textOrNull(row?.mistakeType),
      difficultyRating: n(row?.difficultyRating),
    };
  }).sort((a, b) => a.pageIndex - b.pageIndex);

  const reliable = rows.filter(row => row.marksAwarded != null && row.marksTotal != null && row.marksTotal > 0 && (row.markConfidence ?? 0) >= 0.58);
  const summedAwarded = reliable.reduce((sum, row) => sum + (row.marksAwarded ?? 0), 0);
  const summedTotal = reliable.reduce((sum, row) => sum + (row.marksTotal ?? 0), 0);
  const statedAwarded = n(raw?.totalMarks ?? raw?.writtenTotalMarks);
  const statedTotal = n(raw?.maximumMarks ?? raw?.writtenMaximumMarks);
  const totalMarks = statedAwarded != null ? statedAwarded : summedTotal > 0 ? summedAwarded : null;
  const maximumMarks = statedTotal != null ? statedTotal : summedTotal > 0 ? summedTotal : null;

  const redMarkEvidenceCount = rows.filter(row => row.teacherMarkColor?.toLowerCase().includes("red") || row.markSource.startsWith("red_")).length;
  const inheritedQuestionCount = rows.filter(row => row.questionNoSource === "inherited").length;
  const unknownQuestionCount = rows.filter(row => row.questionNoSource === "unknown").length;
  const explicitMarkEvidenceCount = rows.filter(row => row.markSource !== "none" && (row.markConfidence ?? 0) >= 0.58).length;
  const calculatedTotal = summedTotal > 0 ? { awarded: Math.round(summedAwarded * 100) / 100, maximum: Math.round(summedTotal * 100) / 100 } : null;
  const totalsAgree = statedAwarded == null || calculatedTotal == null ? null : Math.abs(statedAwarded - calculatedTotal.awarded) <= 0.5;

  const scoreFor = (row: NormalizedPaperQuestion) => row.marksAwarded != null && row.marksTotal != null && row.marksTotal > 0 ? row.marksAwarded / row.marksTotal : null;
  const weakFromRows = reliable.filter(row => (scoreFor(row) ?? 1) < 0.7).map(row => row.topicName).filter((x): x is string => Boolean(x));
  const strongFromRows = reliable.filter(row => (scoreFor(row) ?? 0) >= 0.85).map(row => row.topicName).filter((x): x is string => Boolean(x));
  const warnings: string[] = [];
  if (unknownQuestionCount) warnings.push(`${unknownQuestionCount} answer part${unknownQuestionCount === 1 ? "" : "s"} could not be linked to a question number.`);
  if (inheritedQuestionCount) warnings.push(`${inheritedQuestionCount} answer part${inheritedQuestionCount === 1 ? "" : "s"} inherited the question number from the previous page.`);
  if (totalsAgree === false) warnings.push("The written total and the sum of detected question marks do not agree. Confirm the score before saving.");
  if (!redMarkEvidenceCount && reliable.length) warnings.push("Marks were detected, but no red teacher-marking signal was confirmed. Review before saving.");

  return {
    ...raw,
    totalMarks,
    maximumMarks,
    questionResults: rows,
    weakTopics: uniqueStrings(Array.isArray(raw?.weakTopics) ? raw.weakTopics : [], weakFromRows),
    strengths: uniqueStrings(Array.isArray(raw?.strengths) ? raw.strengths : [], strongFromRows),
    nextSteps: uniqueStrings(Array.isArray(raw?.nextSteps) ? raw.nextSteps : []),
    markingEvidence: {
      ...(raw?.markingEvidence && typeof raw.markingEvidence === "object" ? raw.markingEvidence : {}),
      redMarkEvidenceCount,
      explicitMarkEvidenceCount,
      inheritedQuestionCount,
      unknownQuestionCount,
      calculatedTotal,
      writtenTotal: statedAwarded != null || statedTotal != null ? { awarded: statedAwarded, maximum: statedTotal } : null,
      totalsAgree,
      sequenceWarnings: warnings,
    },
  };
}
