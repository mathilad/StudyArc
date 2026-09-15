export type StudyActivity = "Theory" | "Recall" | "Problems" | "Essay" | "Paper" | "Practical Practice";

export type SubjectStudyProfile = {
  paperComponents: string[];
  activities: StudyActivity[];
  practical?: boolean;
  emphasis: string[];
};

const generic = (paperComponents = ["Paper I", "Paper II", "Full Paper"], activities: StudyActivity[] = ["Theory", "Recall", "Paper"]): SubjectStudyProfile => ({ paperComponents, activities, emphasis: activities });

const PROFILES: Record<string, SubjectStudyProfile> = {
  Biology: { paperComponents:["MCQ","Structured","Essay","Full MCQ Paper","Full Essay Paper"], activities:["Theory","Recall","Essay","Paper","Practical Practice"], practical:true, emphasis:["active recall","diagrams","structured answers","essays","practical work"] },
  Physics: { paperComponents:["MCQ","Structured","Essay","Full MCQ Paper","Full Essay Paper"], activities:["Theory","Problems","Paper","Practical Practice"], practical:true, emphasis:["problem solving","structured questions","experiments","papers"] },
  Chemistry: { paperComponents:["MCQ","Structured","Essay","Full MCQ Paper","Full Essay Paper"], activities:["Theory","Problems","Recall","Paper","Practical Practice"], practical:true, emphasis:["calculations","reactions","structured questions","practical work"] },
  "Agricultural Science": { paperComponents:["MCQ","Structured","Essay","Full MCQ Paper","Full Essay Paper"], activities:["Theory","Recall","Essay","Paper","Practical Practice"], practical:true, emphasis:["application","recall","structured answers","practical work"] },
  Accounting: { paperComponents:["Paper I","Paper II","Full Paper"], activities:["Theory","Problems","Paper"], emphasis:["calculations","formats","problem solving","timed papers"] },
  "Business Studies": { paperComponents:["Paper I","Paper II","Full Paper"], activities:["Theory","Recall","Essay","Paper"], emphasis:["concept recall","structured writing","case application","papers"] },
  Economics: { paperComponents:["Paper I","Paper II","Full Paper"], activities:["Theory","Problems","Essay","Paper"], emphasis:["theory","graphs","data/application","structured writing"] },
  "Business Statistics": { paperComponents:["Paper I","Paper II","Full Paper"], activities:["Theory","Problems","Paper"], emphasis:["calculations","interpretation","problem solving","papers"] },
  "Engineering Technology": { paperComponents:["Paper I","Paper II","Full Paper","Practical Practice"], activities:["Theory","Problems","Paper","Practical Practice"], practical:true, emphasis:["technical application","calculations","drawings","practical skills"] },
  "Biosystems Technology": { paperComponents:["Paper I","Paper II","Full Paper","Practical Practice"], activities:["Theory","Problems","Paper","Practical Practice"], practical:true, emphasis:["systems application","technical work","practical skills","papers"] },
  "Science for Technology": { paperComponents:["Paper I","Paper II","Full Paper","Practical Practice"], activities:["Theory","Problems","Paper","Practical Practice"], practical:true, emphasis:["science application","calculations","experiments","papers"] },
  ICT: { paperComponents:["Paper I","Paper II","Full Paper"], activities:["Theory","Recall","Problems","Paper","Practical Practice"], practical:true, emphasis:["concepts","logic","problem solving","practical computing"] },
};

const PRACTICAL_ARTS = new Set(["Art","Dancing - Sinhala","Bharatha Natyam","Oriental Music","Carnatic Music","Western Music","Drama and Theatre - Sinhala","Drama and Theatre - Tamil","Drama and Theatre - English","Civil Technology","Electrical Electronic and Information Technology","Agro Technology","Mechanical Technology","Food Technology","Bio-Resource Technology","Home Economics"]);
const LANGUAGES = new Set(["Sinhala","Tamil","English","Arabic","Pali","Sanskrit","Chinese","French","German","Hindi","Japanese","Malay","Russian"]);
const ESSAY_HEAVY = new Set(["Geography","History","Political Science","Logic and Scientific Method","Communication and Media Studies","Buddhism","Buddhist Civilization","Hinduism","Hindu Civilization","Christianity","Christian Civilization","Islam","Islamic Civilization","Greek and Roman Civilization"]);

export function subjectStudyProfile(subject: string): SubjectStudyProfile {
  if (["Pure Mathematics","Applied Mathematics","Combined Mathematics"].includes(subject)) return { paperComponents:["Part A","Part B","Full Paper"], activities:["Theory","Problems","Paper"], emphasis:["problem solving","timed practice","papers"] };
  if (PROFILES[subject]) return PROFILES[subject];
  if (PRACTICAL_ARTS.has(subject)) return { ...generic(["Paper I","Paper II","Full Paper","Practical Practice"],["Theory","Recall","Paper","Practical Practice"]), practical:true, emphasis:["theory","performance/practical preparation","portfolio or technique","papers"] };
  if (LANGUAGES.has(subject)) return { ...generic(["Paper I","Paper II","Full Paper"],["Theory","Recall","Essay","Paper"]), emphasis:["language use","comprehension","writing","literature/recall","papers"] };
  if (ESSAY_HEAVY.has(subject)) return { ...generic(["Paper I","Paper II","Full Paper"],["Theory","Recall","Essay","Paper"]), emphasis:["concept recall","structured writing","evidence/examples","papers"] };
  return generic();
}

export const paperComponentsForAcademicSubject = (subject: string) => subjectStudyProfile(subject).paperComponents;
export const studyActivitiesForSubject = (subject: string) => subjectStudyProfile(subject).activities;
export const hasPracticalPractice = (subject: string) => Boolean(subjectStudyProfile(subject).practical);
