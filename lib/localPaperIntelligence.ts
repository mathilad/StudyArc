import { SUBJECTS, type SubjectName } from "../data/subjects";

export type LocalPaperLanguage = "English" | "Sinhala" | "Tamil" | "Mixed" | "Unknown";
export type LocalPaperSection = "MCQ" | "Structured" | "Essay" | "Unknown";
export type LocalPaperBlockKind =
  | "heading"
  | "instruction"
  | "question"
  | "answer"
  | "teacher_mark"
  | "score"
  | "date"
  | "subject"
  | "topic"
  | "other";

export type LocalPaperBlock = {
  text: string;
  language: LocalPaperLanguage;
  kind: LocalPaperBlockKind;
  section: LocalPaperSection;
  questionNo: string | null;
  marksAwarded: number | null;
  marksTotal: number | null;
  confidence: number;
};

export type LocalPaperInterpretation = {
  language: LocalPaperLanguage;
  subjectName: SubjectName | null;
  title: string;
  paperDate: string | null;
  sections: Record<Exclude<LocalPaperSection, "Unknown">, { score: number | null; total: number | null }>;
  blocks: LocalPaperBlock[];
  weakTopics: string[];
  detectedTopics: string[];
  warnings: string[];
  confidence: number;
};

const SINHALA = /[\u0D80-\u0DFF]/u;
const TAMIL = /[\u0B80-\u0BFF]/u;
const LATIN = /[A-Za-z]/;
const QUESTION = /^(?:q(?:uestion)?\s*)?(\d{1,3})(?:\s*[.)]|\s*[-:]|\s+[a-z][.)])?/i;
const FRACTION_MARK = /(?:marks?\s*)?([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)/i;
const DATE_ISO = /\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/;
const DATE_DMY = /\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/;

const normalize = (value: string) => value.replace(/\r/g, "").replace(/[\t ]+/g, " ").trim();
const lower = (value: string) => normalize(value).toLocaleLowerCase();

export function detectLocalPaperLanguage(text: string): LocalPaperLanguage {
  const hasSi = SINHALA.test(text);
  const hasTa = TAMIL.test(text);
  const hasEn = LATIN.test(text);
  const count = Number(hasSi) + Number(hasTa) + Number(hasEn);
  if (count > 1) return "Mixed";
  if (hasSi) return "Sinhala";
  if (hasTa) return "Tamil";
  if (hasEn) return "English";
  return "Unknown";
}

function detectSection(text: string, current: LocalPaperSection): LocalPaperSection {
  const t = lower(text);
  if (/\bmcq\b|multiple choice|objective|බහුවරණ|பல்தேர்வு/.test(t)) return "MCQ";
  if (/structured|structured essay|ව්‍යුහගත|கட்டமைக்கப்பட்ட/.test(t)) return "Structured";
  if (/\bessay\b|රචනා|විස්තරාත්මක|கட்டுரை/.test(t)) return "Essay";
  return current;
}

function detectKind(text: string): LocalPaperBlockKind {
  const t = lower(text);
  if (DATE_ISO.test(t) || DATE_DMY.test(t)) return "date";
  if (/^(paper|part|section|mcq|essay|structured|objective)\b|^(ප්‍රශ්න|කොටස|ව්‍යුහගත|රචනා)|^(பகுதி|வினா|கட்டுரை)/i.test(normalize(text))) return "heading";
  if (/instructions?|answer all|choose|time allowed|කාලය|පිළිතුරු|அனைத்திற்கும் பதிலளி|நேரம்/i.test(t)) return "instruction";
  if (FRACTION_MARK.test(t) || /\b(total|score|marks?)\b|ලකුණු|மதிப்பெண்/.test(t)) return "score";
  if (/^[✓✔✗✘×]/.test(normalize(text)) || /\b(correct|wrong)\b|නිවැරදි|වැරදි|சரி|தவறு/.test(t)) return "teacher_mark";
  if (QUESTION.test(normalize(text))) return "question";
  if (text.length > 80) return "answer";
  return "other";
}

function parseDate(text: string): string | null {
  const iso = text.match(DATE_ISO);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(iso[3]).padStart(2, "0")}`;
  const dmy = text.match(DATE_DMY);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;
  return null;
}

function sectionScore(text: string, section: LocalPaperSection) {
  const t = lower(text);
  const names: Record<Exclude<LocalPaperSection, "Unknown">, RegExp> = {
    MCQ: /mcq|objective|multiple choice|බහුවරණ|பல்தேர்வு/,
    Structured: /structured|ව්‍යුහගත|கட்டமைக்கப்பட்ட/,
    Essay: /essay|රචනා|විස්තරාත්මක|கட்டுரை/,
  };
  const fraction = text.match(FRACTION_MARK);
  if (!fraction || section === "Unknown") return null;
  if (!names[section].test(t) && !/^\s*[0-9.]+\s*\/\s*[0-9.]+\s*$/.test(text)) return null;
  const score = Number(fraction[1]);
  const total = Number(fraction[2]);
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0 || score < 0 || score > total) return null;
  return { score, total };
}

function detectSubject(text: string, allowedSubjects?: SubjectName[]) {
  const pool = allowedSubjects?.length ? allowedSubjects : (Object.keys(SUBJECTS) as SubjectName[]);
  const t = lower(text);
  const aliases: Record<string, string[]> = {
    Physics: ["physics", "භෞතික", "இயற்பியல்"],
    Chemistry: ["chemistry", "රසායන", "வேதியியல்"],
    Biology: ["biology", "ජීව විද්‍යා", "உயிரியல்"],
    "Combined Mathematics": ["combined mathematics", "combined maths", "සංයුක්ත ගණිත", "இணைந்த கணித"],
    "Pure Mathematics": ["pure mathematics", "pure maths", "ශුද්ධ ගණිත", "தூய கணித"],
    "Applied Mathematics": ["applied mathematics", "applied maths", "ව්‍යවහාරික ගණිත", "பயன்பாட்டு கணித"],
  };
  let best: SubjectName | null = null;
  let bestLength = 0;
  for (const subject of pool) {
    const candidates = [subject.toLowerCase(), ...(aliases[subject] ?? [])];
    for (const candidate of candidates) {
      if (candidate.length > bestLength && t.includes(candidate.toLowerCase())) {
        best = subject;
        bestLength = candidate.length;
      }
    }
  }
  return best;
}

function detectTopics(text: string, subjectName: SubjectName | null) {
  if (!subjectName) return [] as string[];
  const t = lower(text);
  const topics = SUBJECTS[subjectName]?.topics ?? [];
  return topics.filter(topic => {
    const title = topic.title.toLowerCase();
    if (title.length >= 5 && t.includes(title)) return true;
    return topic.subtopics?.some(sub => {
      const value = typeof sub === "string" ? sub : sub.title;
      return value.length >= 5 && t.includes(value.toLowerCase());
    }) ?? false;
  }).map(topic => topic.title);
}

export function interpretRecognizedPaperText(
  pageTexts: string[],
  options: { allowedSubjects?: SubjectName[]; fallbackTitle?: string } = {},
): LocalPaperInterpretation {
  const whole = pageTexts.join("\n");
  const language = detectLocalPaperLanguage(whole);
  const subjectName = detectSubject(whole, options.allowedSubjects);
  const detectedTopics = detectTopics(whole, subjectName);
  const lines = pageTexts.flatMap(text => text.split(/\n+/).map(normalize).filter(Boolean));
  const sections = {
    MCQ: { score: null, total: null },
    Structured: { score: null, total: null },
    Essay: { score: null, total: null },
  } as LocalPaperInterpretation["sections"];
  const blocks: LocalPaperBlock[] = [];
  let currentSection: LocalPaperSection = "Unknown";
  let paperDate: string | null = null;

  for (const line of lines) {
    currentSection = detectSection(line, currentSection);
    paperDate ||= parseDate(line);
    const question = line.match(QUESTION)?.[1] ?? null;
    const mark = line.match(FRACTION_MARK);
    const score = sectionScore(line, currentSection);
    if (score && currentSection !== "Unknown") sections[currentSection] = score;
    blocks.push({
      text: line,
      language: detectLocalPaperLanguage(line),
      kind: detectKind(line),
      section: currentSection,
      questionNo: question,
      marksAwarded: mark ? Number(mark[1]) : null,
      marksTotal: mark ? Number(mark[2]) : null,
      confidence: question || mark ? 0.9 : currentSection !== "Unknown" ? 0.78 : 0.62,
    });
  }

  const weakTopics = detectedTopics.filter(topic => {
    const topicRows = blocks.filter(block => lower(block.text).includes(topic.toLowerCase()));
    return topicRows.some(block => block.marksAwarded != null && block.marksTotal != null && block.marksTotal > 0 && block.marksAwarded / block.marksTotal < 0.7);
  });
  const warnings: string[] = [];
  if (!subjectName) warnings.push("Subject could not be identified confidently. Confirm it before saving.");
  if (!paperDate) warnings.push("Paper date was not found. Enter it manually before saving.");
  if (!blocks.some(block => block.kind === "question")) warnings.push("No reliable question numbers were found. Review the recognized text before importing question data.");
  if (language === "Mixed") warnings.push("Multiple writing systems were detected. Review low-confidence lines carefully.");

  const evidence = [Boolean(subjectName), Boolean(paperDate), blocks.some(b => b.kind === "question"), blocks.some(b => b.kind === "score")].filter(Boolean).length;
  return {
    language,
    subjectName,
    title: normalize(lines.find(line => detectKind(line) === "heading") ?? options.fallbackTitle ?? "Uploaded paper"),
    paperDate,
    sections,
    blocks,
    weakTopics,
    detectedTopics,
    warnings,
    confidence: Math.max(0.35, Math.min(0.96, 0.42 + evidence * 0.12)),
  };
}
