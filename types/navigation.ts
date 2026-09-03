import type { SubjectName } from "../data/subjects";

export type RootStackParamList = {
  subject: { subjectName: SubjectName };
  topic: { subjectName: SubjectName; topicName: string };
  stopwatch: {
    subjectName?: SubjectName | "Quick Study";
    topicName?: string;
    studyType?: "Tute Questions" | "Past Papers" | "Study Session" | "Revision";
    paperYear?: string;
    paperSection?: "MCQ" | "Essay" | "Full Paper";
    attemptNo?: string;
  };
};
