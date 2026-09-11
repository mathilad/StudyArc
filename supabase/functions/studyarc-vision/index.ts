import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const prompts: Record<string, string> = {
  homework: `You are StudyArc, an assistant for Sri Lankan G.C.E. A/L students. Inspect the uploaded homework photo. Return ONLY JSON with: title, subjectName, topicName, dueDate (YYYY-MM-DD or null), estimatedMinutes (integer), tasks (array of short subtasks), summary, confidence (0-1). Do not invent a due date if it is not visible. Subject names should use standard A/L English subject names.`,
  tute: `You are StudyArc, an assistant for Sri Lankan G.C.E. A/L students. Inspect the uploaded tutorial/tute image or PDF. Determine what work the student is expected to complete. Return ONLY JSON with: title, subjectName, topicName, dueDate (YYYY-MM-DD or null), estimatedMinutes (integer), tasks (array of short subtasks), summary, confidence (0-1). Keep tasks actionable and concise.`,
  test_result: `Inspect this marked test or result sheet for a Sri Lankan G.C.E. A/L student. Return ONLY JSON with: title, subjectName, totalMarks (number or null), maximumMarks (number or null), weakTopics (array), questionResults (array of objects with questionNo, topicName, marksAwarded, marksTotal, confidence null, mistakeType null), summary, confidence (0-1). Only include values visible or strongly supported by the marking.`,
  paper_marking: `Inspect this marked examination/past-paper answer sheet or marking. Return ONLY JSON with: title, subjectName, paperLabel, totalMarks (number or null), maximumMarks (number or null), questionResults (array of objects with questionNo, topicName, marksAwarded, marksTotal, durationSeconds null, confidence null, mistakeType null, difficultyRating null), weakTopics (array), summary, confidence (0-1). Do not invent marks that are not visible.`,
};

function textFromResponse(payload: any) {
  return (payload?.candidates?.[0]?.content?.parts ?? []).map((part: any) => typeof part?.text === "string" ? part.text : "").join("").trim();
}
function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("Gemini did not return valid JSON.");
  return JSON.parse(cleaned.slice(first, last + 1));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "vision_not_configured", message: "Smart Capture is ready, but the GEMINI_API_KEY Supabase secret has not been added yet." }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
    const body = await req.json();
    const kind = String(body?.kind ?? "homework");
    const mimeType = String(body?.mimeType ?? "image/jpeg");
    const base64 = String(body?.base64 ?? "");
    if (!prompts[kind]) return new Response(JSON.stringify({ error: "unsupported_kind" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    if (!base64 || base64.length > 24_000_000) return new Response(JSON.stringify({ error: "invalid_file", message: "Upload is missing or too large." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompts[kind] }, { inlineData: { mimeType, data: base64 } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: "application/json" },
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message ?? `Gemini request failed (${response.status}).`);
    const analysis = parseJson(textFromResponse(payload));
    return new Response(JSON.stringify({ analysis }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: "analysis_failed", message: error instanceof Error ? error.message : "Could not analyse upload." }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
