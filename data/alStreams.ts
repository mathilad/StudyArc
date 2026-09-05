export type ALStream = "Physical Science" | "Biological Science" | "Commerce" | "Arts" | "Technology";

export type ALStreamConfig = {
  id: ALStream;
  title: string;
  description: string;
  subjects: string[];
};

// Current Study Arc onboarding catalog for the established G.C.E. A/L stream model.
// Rich lesson/sublesson content can be supplied by data/subjects.ts or by the
// admin-managed academic catalog as it grows; selection itself is never limited
// to the original science-only set.
export const AL_STREAMS: ALStreamConfig[] = [
  {
    id: "Physical Science",
    title: "Physical Science / Mathematics",
    description: "Mathematics and physical-science combinations.",
    subjects: ["Combined Mathematics", "Physics", "Chemistry", "ICT"],
  },
  {
    id: "Biological Science",
    title: "Biological Science",
    description: "Biology, physical science and agriculture combinations.",
    subjects: ["Biology", "Chemistry", "Physics", "Agricultural Science", "ICT"],
  },
  {
    id: "Commerce",
    title: "Commerce",
    description: "Business, accounting and economics combinations.",
    subjects: ["Accounting", "Business Studies", "Economics", "Business Statistics", "ICT", "Geography"],
  },
  {
    id: "Technology",
    title: "Technology",
    description: "Engineering/Biosystems Technology combinations with Science for Technology.",
    subjects: ["Engineering Technology", "Biosystems Technology", "Science for Technology", "ICT"],
  },
  {
    id: "Arts",
    title: "Arts",
    description: "Languages, humanities, religions, social sciences and aesthetic subjects.",
    subjects: [
      "Sinhala", "Tamil", "English", "Pali", "Sanskrit", "Arabic", "Malay",
      "French", "German", "Russian", "Hindi", "Japanese", "Chinese", "Korean",
      "Logic and Scientific Method", "Geography", "Political Science", "Economics",
      "History of Sri Lanka", "History of India", "History of Europe", "Modern World History",
      "Communication and Media Studies", "Home Economics",
      "Buddhism", "Buddhist Civilization", "Hinduism", "Hindu Civilization",
      "Islam", "Islamic Civilization", "Christianity", "Christian Civilization",
      "Art", "Oriental Music", "Western Music", "Carnatic Music",
      "Dancing", "Bharatha Natyam", "Drama and Theatre",
    ],
  },
];

export const streamConfig = (stream?: string | null) => AL_STREAMS.find(item => item.id === stream);
export const subjectsForStream = (stream?: string | null) => streamConfig(stream)?.subjects ?? [];

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
