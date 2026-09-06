import { AL_STREAMS } from "./alStreams";
import { SUBJECTS, type SubjectConfig } from "./subjects";

const palette = [
  ["#B784FF", "#7651B4"], ["#63B8FF", "#2A7DD0"], ["#65D79A", "#2B9D67"],
  ["#FF9AAE", "#CC536E"], ["#F0BE6B", "#B77A28"], ["#48D6D2", "#168C91"],
  ["#A5A9FF", "#6168C9"], ["#E79AEF", "#A84BB4"],
] as const;

function hash(value: string) { let h = 0; for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0; return h; }

const genericConfig = (subject: string): SubjectConfig => {
  const [color, accent] = palette[hash(subject) % palette.length];
  return {
    icon: "book-open-page-variant",
    color,
    accent,
    topics: [{
      id: `${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-general`,
      title: "General / uncategorised",
      sinhala: "සාමාන්‍ය / වර්ගීකරණය නොකළ",
      unit: "General",
      subtopics: ["General study"],
      subtopicsSinhala: ["සාමාන්‍ය අධ්‍යයනය"],
    }],
  };
};

// SUBJECTS began as the science-stream catalog. Keep its verified rich content,
// but register every stream subject so older screens and contexts can safely
// handle a user from Arts, Commerce or Technology without crashing or hiding it.
for (const subject of AL_STREAMS.flatMap(stream => stream.subjects)) {
  if (subject === "Combined Mathematics") continue;
  if (!(subject in SUBJECTS)) (SUBJECTS as Record<string, SubjectConfig>)[subject] = genericConfig(subject);
}
