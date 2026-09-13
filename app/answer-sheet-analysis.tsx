import { useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import PaperWrittenDateGate from "../components/PaperWrittenDateGate";
import ScanningDisabled from "../components/ScanningDisabled";
import { useAppConfig } from "../context/AppConfigContext";
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
  const { settings } = useAppConfig();
  const sourceClassId = first(params.sourceClassId) ?? first(params.classId) ?? null;
  const occurrenceDate = first(params.occurrenceDate) ?? null;
  const subjectName = first(params.subjectName) ?? null;
  const scanningEnabled = settings.featureFlags.captureScanning !== false;

  useEffect(() => {
    if (!scanningEnabled || !occurrenceDate) return;
    setActivePaperClassLink({ sourceClassId, occurrenceDate, subjectName });
    return () => clearActivePaperClassLink(sourceClassId);
  }, [occurrenceDate, scanningEnabled, sourceClassId, subjectName]);

  if (!scanningEnabled) return <ScanningDisabled title="Answer-sheet scanning is currently disabled" />;
  if (!occurrenceDate) return <PaperWrittenDateGate sourceClassId={sourceClassId} subjectName={subjectName} />;
  return <AnswerSheetAnalysisScreen />;
}
