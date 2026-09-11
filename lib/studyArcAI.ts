import { File } from "expo-file-system";
import { supabase } from "./supabase";
import type { PlanningPreferences } from "./planningRuntime";
import type { CaptureAsset } from "./visionCapture";

export type StudyArcAIAction =
  | {
      type: "create_assignment";
      title: string;
      subjectName: string;
      topicName?: string | null;
      dueAt?: string | null;
      estimatedMinutes?: number;
      subtasks?: string[];
    }
  | {
      type: "update_plan";
      changes: Partial<PlanningPreferences>;
      reason?: string;
    }
  | {
      type: "update_profile";
      changes: {
        wakeTime?: string;
        sleepTime?: string;
        selfStudyHours?: number;
        morningRoutineMinutes?: number;
      };
    }
  | {
      type: "create_exam";
      name: string;
      examType?: string;
      startsOn?: string | null;
      endsOn?: string | null;
      isMainExam?: boolean;
      components?: Array<{ subjectName: string; componentName: string; examAt?: string | null }>;
    }
  | {
      type: "add_test_result";
      subjectName: string;
      title: string;
      testDate?: string;
      mcqScore?: number | null;
      mcqTotal?: number | null;
      essayScore?: number | null;
      essayTotal?: number | null;
      weakTopics?: string[];
    }
  | {
      type: "create_class";
      subjectName: string;
      title?: string;
      classType?: "Theory" | "Revision" | "Paper" | "Extra Class" | "Paper Discussion";
      deliveryMode?: "Physical" | "Online";
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      preReviewMinutes?: number;
      travelMinutes?: number;
    }
  | {
      type: "set_lesson_coverage";
      subjectName: string;
      topicName: string;
      covered: boolean;
    };

export type StudyArcAIResponse = {
  reply: string;
  transcript?: string | null;
  actions: StudyArcAIAction[];
  confidence?: number;
};

export type StudyArcAIAudio = {
  base64: string;
  mimeType: string;
  filename: string;
};

export type StudyArcAIContext = {
  profile: Record<string, unknown>;
  planning: Record<string, unknown>;
  assignments: Array<Record<string, unknown>>;
  classes: Array<Record<string, unknown>>;
  exams: Array<Record<string, unknown>>;
  examComponents: Array<Record<string, unknown>>;
  weakTopics: Array<Record<string, unknown>>;
};

export async function audioAssetFromUri(uri: string): Promise<StudyArcAIAudio> {
  const file = new File(uri);
  const base64 = await file.base64();
  const lower = uri.toLowerCase();
  const mimeType = lower.endsWith(".wav") ? "audio/wav" : lower.endsWith(".mp3") ? "audio/mpeg" : "audio/mp4";
  const ext = mimeType === "audio/wav" ? "wav" : mimeType === "audio/mpeg" ? "mp3" : "m4a";
  return { base64, mimeType, filename: `studyarc-voice-${Date.now()}.${ext}` };
}

export async function askStudyArcAI(input: {
  message: string;
  attachment?: CaptureAsset | null;
  audio?: StudyArcAIAudio | null;
  context: StudyArcAIContext;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}): Promise<StudyArcAIResponse> {
  const { data, error } = await supabase.functions.invoke("studyarc-ai", {
    body: {
      message: input.message,
      attachment: input.attachment ? {
        base64: input.attachment.base64,
        mimeType: input.attachment.mimeType,
        filename: input.attachment.filename,
      } : null,
      audio: input.audio ?? null,
      context: input.context,
      history: (input.history ?? []).slice(-8),
      localNow: new Date().toString(),
      timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
    },
  });
  if (error) throw new Error(error.message || "StudyArc AI could not respond.");
  if (data?.error) throw new Error(data.message || data.error);
  if (!data || typeof data.reply !== "string" || !Array.isArray(data.actions)) throw new Error("StudyArc AI returned an invalid response.");
  return {
    reply: data.reply,
    transcript: typeof data.transcript === "string" ? data.transcript : null,
    actions: data.actions as StudyArcAIAction[],
    confidence: typeof data.confidence === "number" ? data.confidence : undefined,
  };
}
