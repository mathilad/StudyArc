import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const prompts: Record<string, string> = {
  homework: `You are StudyArc, an assistant for Sri Lankan G.C.E. A/L students. Inspect the uploaded homework photo. Return ONLY JSON with: title, subjectName, topicName, dueDate (YYYY-MM-DD or null), estimatedMinutes (integer), tasks (array of short subtasks), summary, confidence (0-1). Do not invent a due date if it is not visible. Subject names should use standard A/L English subject names.`,
  tute: `You are StudyArc, an assistant for Sri Lankan G.C.E. A/L students. Inspect the uploaded tutorial/tute image. Determine what work the student is expected to complete. Return ONLY JSON with: title, subjectName, topicName, dueDate (YYYY-MM-DD or null), estimatedMinutes (integer), tasks (array of short subtasks), summary, confidence (0-1). Keep tasks actionable and concise.`,
  test_result: `Inspect this marked test or result sheet for a Sri Lankan G.C.E. A/L student. Return ONLY JSON with: title, subjectName, totalMarks (number or null), maximumMarks (number or null), weakTopics (array), questionResults (array of objects with questionNo, topicName, marksAwarded, marksTotal, confidence null, mistakeType null), summary, confidence (0-1). Only include values visible or strongly supported by the marking.`,
  paper_marking: `Inspect this marked examination/past-paper answer sheet or marking. Return ONLY JSON with: title, subjectName, paperLabel, totalMarks (number or null), maximumMarks (number or null), questionResults (array of objects with questionNo, topicName, marksAwarded, marksTotal, durationSeconds null, confidence null, mistakeType null, difficultyRating null), weakTopics (array), summary, confidence (0-1). Do not invent marks that are not visible.`,
  answer_sheet: `You are StudyArc analysing a Sri Lankan G.C.E. A/L student's own answer sheet. Read every answer and question part carefully. If a second uploaded image is supplied after the text REFERENCE MARKING MATERIAL, use it as the question paper, model answer or marking scheme. A StudyArc syllabus catalog may also be supplied. When it is supplied, match each answer part to the closest exact subjectName, topicName and subtopicName from that catalog rather than inventing lesson names. Return ONLY JSON with: title, subjectName, paperLabel, hasReference (boolean), totalMarks (number or null), maximumMarks (number or null), weakTopics (array of exact topic names when possible), strengths (array), nextSteps (array), questionResults (array of objects with questionNo, questionPart, topicName, subtopicName, lessonConfidence (0-1), marksAwarded, marksTotal, answerSummary, feedback, confidence, mistakeType, difficultyRating null), summary, confidence (0-1). If no reliable marking reference is supplied, do not invent marks: use null for marksAwarded and marksTotal, but still identify answer completeness, likely misconceptions, weak topics, unclear handwriting, skipped questions and useful feedback. If a marking scheme/model answer is present, grade conservatively against it. Never claim certainty when handwriting or a diagram is unclear.`,
};

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("Qwen3-VL did not return valid JSON.");
  return JSON.parse(cleaned.slice(first, last + 1));
}

function qwenText(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((part: any) => typeof part?.text === "string" ? part.text : "").join("").trim();
  }
  return "";
}

function geminiText(payload: any) {
  return (payload?.candidates?.[0]?.content?.parts ?? []).map((part: any) => typeof part?.text === "string" ? part.text : "").join("").trim();
}

function qwenChatUrl() {
  const explicit = Deno.env.get("QWEN_VL_CHAT_URL")?.trim();
  if (explicit) return explicit;
  const base = Deno.env.get("QWEN_VL_BASE_URL")?.trim().replace(/\/$/, "");
  if (!base) return null;
  return base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
}

function dataUrl(mimeType: string, base64: string) {
  return `data:${mimeType};base64,${base64}`;
}

async function analyseWithQwen(args: {
  kind: string;
  prompt: string;
  base64: string;
  mimeType: string;
  referenceBase64: string;
  referenceMimeType: string;
}) {
  const url = qwenChatUrl();
  if (!url) throw new Error("Qwen3-VL endpoint is not configured.");
  const model = Deno.env.get("QWEN_VL_MODEL")?.trim() || "Qwen/Qwen3-VL-4B-Instruct";
  const apiKey = Deno.env.get("QWEN_VL_API_KEY")?.trim();
  const content: any[] = [
    { type: "text", text: args.prompt },
    { type: "image_url", image_url: { url: dataUrl(args.mimeType, args.base64) } },
  ];
  if (args.kind === "answer_sheet" && args.referenceBase64) {
    content.push({ type: "text", text: "REFERENCE MARKING MATERIAL follows. Use it only where it clearly supports grading." });
    content.push({ type: "image_url", image_url: { url: dataUrl(args.referenceMimeType, args.referenceBase64) } });
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.05,
      max_tokens: 8192,
      messages: [
        { role: "system", content: "You are the StudyArc Qwen3-VL vision engine. Be conservative with uncertain handwriting and marks. Return only one valid JSON object and no markdown." },
        { role: "user", content },
      ],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message ?? payload?.message ?? `Qwen3-VL request failed (${response.status}).`);
  return { analysis: parseJson(qwenText(payload)), engine: "qwen3-vl", model };
}

async function analyseWithGeminiFallback(args: {
  kind: string;
  prompt: string;
  base64: string;
  mimeType: string;
  referenceBase64: string;
  referenceMimeType: string;
}) {
  const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!apiKey) throw new Error("Qwen3-VL is not configured and no fallback vision provider is available.");
  const parts: any[] = [{ text: args.prompt }, { inlineData: { mimeType: args.mimeType, data: args.base64 } }];
  if (args.kind === "answer_sheet" && args.referenceBase64) {
    parts.push({ text: "REFERENCE MARKING MATERIAL follows. Use it only when it clearly supports grading." });
    parts.push({ inlineData: { mimeType: args.referenceMimeType, data: args.referenceBase64 } });
  }
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.05, maxOutputTokens: 8192, responseMimeType: "application/json" },
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message ?? `Fallback vision request failed (${response.status}).`);
  return { analysis: parseJson(geminiText(payload)), engine: "gemini-fallback", model };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const body = await req.json();
    const kind = String(body?.kind ?? "homework");
    const mimeType = String(body?.mimeType ?? "image/jpeg");
    const base64 = String(body?.base64 ?? "");
    const referenceBase64 = body?.referenceBase64 ? String(body.referenceBase64) : "";
    const referenceMimeType = body?.referenceMimeType ? String(body.referenceMimeType) : "image/jpeg";
    if (!prompts[kind]) return new Response(JSON.stringify({ error: "unsupported_kind" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    if (!base64 || base64.length > 24_000_000 || referenceBase64.length > 24_000_000) return new Response(JSON.stringify({ error: "invalid_file", message: "Upload is missing or too large." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    let prompt = prompts[kind];
    if (kind === "answer_sheet" && Array.isArray(body?.syllabusCatalog)) {
      const catalogText = JSON.stringify(body.syllabusCatalog).slice(0, 120_000);
      prompt += `\n\nSTUDYARC SYLLABUS CATALOG. Use these exact names when classifying every answer part:\n${catalogText}`;
    }

    const args = { kind, prompt, base64, mimeType, referenceBase64, referenceMimeType };
    let result;
    if (qwenChatUrl()) {
      try {
        result = await analyseWithQwen(args);
      } catch (error) {
        if (!Deno.env.get("GEMINI_API_KEY")) throw error;
        result = await analyseWithGeminiFallback(args);
      }
    } else {
      result = await analyseWithGeminiFallback(args);
    }
    return new Response(JSON.stringify(result), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not analyse upload.";
    const notConfigured = message.includes("not configured") || message.includes("no fallback");
    return new Response(JSON.stringify({ error: notConfigured ? "qwen_not_configured" : "analysis_failed", message }), { status: notConfigured ? 503 : 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
