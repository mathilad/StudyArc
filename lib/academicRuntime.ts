import type { PaperTopicResult } from "../context/AcademicContext";

let runtimePaperTopicResults: PaperTopicResult[] = [];

export function setRuntimePaperTopicResults(value: PaperTopicResult[]) {
  runtimePaperTopicResults = value;
}

export function getRuntimePaperTopicResults() {
  return runtimePaperTopicResults;
}
