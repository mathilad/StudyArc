export type ALStream = "Physical Science" | "Biological Science" | "Commerce" | "Arts" | "Engineering Technology" | "Biosystems Technology";

export type ALStreamConfig = {
  id: ALStream;
  title: string;
  description: string;
  subjects: string[];
  requiredSubjects?: string[];
  coreSubjects?: string[];
  minimumCoreSelections?: number;
};

export const AL_STREAMS: ALStreamConfig[] = [
  {
    id: "Physical Science",
    title: "Physical Science / Mathematics",
    description: "Choose three from the physical-science mathematics group.",
    subjects: ["Combined Mathematics", "Higher Mathematics", "Physics", "Chemistry"],
  },
  {
    id: "Biological Science",
    title: "Biological Science",
    description: "Biology is required, with two additional approved science/agriculture subjects.",
    requiredSubjects: ["Biology"],
    subjects: ["Biology", "Chemistry", "Physics", "Mathematics", "Agricultural Science"],
  },
  {
    id: "Commerce",
    title: "Commerce",
    description: "Choose at least two of Accounting, Business Studies and Economics, plus an approved third subject.",
    coreSubjects: ["Accounting", "Business Studies", "Economics"],
    minimumCoreSelections: 2,
    subjects: [
      "Accounting", "Business Studies", "Economics", "Business Statistics", "Agricultural Science", "Geography",
      "German", "Combined Mathematics", "Mathematics", "History", "Political Science", "English",
      "Logic and Scientific Method", "French", "ICT",
    ],
  },
  {
    id: "Engineering Technology",
    title: "Technology – Engineering",
    description: "Engineering Technology and Science for Technology are required; choose one approved third subject.",
    requiredSubjects: ["Engineering Technology", "Science for Technology"],
    subjects: [
      "Engineering Technology", "Science for Technology", "Economics", "Geography", "Home Economics", "English",
      "Communication and Media Studies", "ICT", "Art", "Business Studies", "Agricultural Science", "Accounting", "Mathematics",
    ],
  },
  {
    id: "Biosystems Technology",
    title: "Technology – Biosystems",
    description: "Biosystems Technology and Science for Technology are required; choose one approved third subject.",
    requiredSubjects: ["Biosystems Technology", "Science for Technology"],
    subjects: [
      "Biosystems Technology", "Science for Technology", "Economics", "Geography", "Home Economics", "English",
      "Communication and Media Studies", "ICT", "Art", "Business Studies", "Agricultural Science", "Accounting", "Mathematics",
    ],
  },
  {
    id: "Arts",
    title: "Arts",
    description: "Languages, social sciences, religions/civilizations, aesthetics and approved applied subjects.",
    subjects: [
      "Economics", "Geography", "History", "Home Economics", "Agricultural Science", "Mathematics", "Combined Mathematics",
      "Communication and Media Studies", "ICT", "Accounting", "Business Statistics", "Political Science", "Logic and Scientific Method",
      "Civil Technology", "Electrical Electronic and Information Technology", "Agro Technology", "Mechanical Technology",
      "Food Technology", "Bio-Resource Technology",
      "Buddhism", "Buddhist Civilization", "Hinduism", "Hindu Civilization", "Christianity", "Christian Civilization",
      "Islam", "Islamic Civilization", "Greek and Roman Civilization",
      "Art", "Dancing - Sinhala", "Bharatha Natyam", "Oriental Music", "Carnatic Music", "Western Music",
      "Drama and Theatre - Sinhala", "Drama and Theatre - Tamil", "Drama and Theatre - English",
      "Sinhala", "Tamil", "English", "Arabic", "Pali", "Sanskrit", "Chinese", "French", "German", "Hindi", "Japanese", "Malay", "Russian",
    ],
  },
];

export const streamConfig = (stream?: string | null) => AL_STREAMS.find(item => item.id === stream);
export const subjectsForStream = (stream?: string | null) => streamConfig(stream)?.subjects ?? [];

export function validateSubjectCombination(stream: ALStream, selected: string[]): string | null {
  const config = streamConfig(stream);
  if (!config) return "Choose a valid A/L stream.";
  if (selected.length !== 3) return "Choose exactly three A/L subjects.";
  for (const required of config.requiredSubjects ?? []) if (!selected.includes(required)) return `${required} is required for ${config.title}.`;
  if (config.coreSubjects?.length && config.minimumCoreSelections) {
    const count = selected.filter(subject => config.coreSubjects!.includes(subject)).length;
    if (count < config.minimumCoreSelections) return `Choose at least ${config.minimumCoreSelections} Commerce core subjects: ${config.coreSubjects.join(", ")}.`;
  }
  if (selected.some(subject => !config.subjects.includes(subject))) return "One or more selected subjects do not belong to this stream combination.";
  return null;
}

export const paperComponentsForSubject = (subject: string): string[] => {
  if (["Physics", "Chemistry", "Biology", "Agricultural Science"].includes(subject)) return ["MCQ", "Structured / Essay"];
  if (subject === "Combined Mathematics") return ["Paper I", "Paper II"];
  if (["Engineering Technology", "Biosystems Technology", "Science for Technology"].includes(subject)) return ["Paper I", "Paper II"];
  return ["Paper I", "Paper II"];
};

export const plannerSubjectsFromChoices = (choices: string[]) => {
  const result: string[] = [];
  choices.forEach(choice => {
    if (choice === "Combined Mathematics") result.push("Pure Mathematics", "Applied Mathematics");
    else result.push(choice);
  });
  return [...new Set(result.filter(Boolean))];
};
