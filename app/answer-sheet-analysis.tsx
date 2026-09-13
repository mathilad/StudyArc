import { useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { clearActivePaperClassLink, setActivePaperClassLink } from "../lib/paperClassLink";
import AnswerSheetAnalysisScreen from "../screens/AnswerSheetAnalysisScreen";

const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

export default function AnswerSheetAnalysisRoute() {
  const params = useLocalSearchParams<{
    sourceClassId?: string | string[];
    classId?: string | string[];
    occurrenceDate?: string | string[];
    subjectName?: string | string[];
  }>();
  const sourceClassId = first(params.sourceClassId) ?? first(params.classId) ?? null;
  const occurrenceDate = first(params.occurrenceDate) ?? null;
  const subjectName = first(params.subjectName) ?? null;

  useEffect(() => {
    setActivePaperClassLink({ sourceClassId, occurrenceDate, subjectName });
    return () => clearActivePaperClassLink(sourceClassId);
  }, [occurrenceDate, sourceClassId, subjectName]);

  return <AnswerSheetAnalysisScreen />;
}
