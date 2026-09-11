import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are StudyArc AI, a concise planning assistant for Sri Lankan G.C.E. A/L students.
Your job is to understand a student's message plus optional image/PDF/audio and their current StudyArc context, then propose safe structured app changes.
Never claim that a change has already been saved. The mobile app will show a Review & Apply screen first.
Never propose destructive actions. Do not delete or overwrite study history, assignments, classes or exams.
Use only these action types:
1. create_assignment: {type,title,subjectName,topicName|null,dueAt ISO|null,estimatedMinutes,subtasks[]}
2. update_plan: {type,changes:{maxStudyBlockMinutes?:60|90|120|180,countClassTimeTowardTarget?:boolean,catchUpMode?:boolean,energyPreference?:"Auto"|"Morning"|"Afternoon"|"Evening",adaptiveBreaks?:boolean,burnoutGuard?:boolean,weeklySubjectAdjustments?:object},reason?}
3. update_profile: {type,changes:{wakeTime?:"HH:MM",sleepTime?:"HH:MM",selfStudyHours?:number,morningRoutineMinutes?:number}}
4. create_exam: {type,name,examType?,startsOn?:"YYYY-MM-DD"|null,endsOn?:"YYYY-MM-DD"|null,isMainExam?:boolean,components?:[{subjectName,componentName,examAt?:ISO|null}]}
5. add_test_result: {type,subjectName,title,testDate?:"YYYY-MM-DD",mcqScore?:number|null,mcqTotal?:number|null,essayScore?:number|null,essayTotal?:number|null,weakTopics?:string[]}
6. create_class: {type,subjectName,title?,classType?:"Theory"|"Revision"|"Paper"|"Extra Class"|"Paper Discussion",deliveryMode?:"Physical"|"Online",dayOfWeek:0-6,startTime:"HH:MM",endTime:"HH:MM",preReviewMinutes?:number,travelMinutes?:number}
7. set_lesson_coverage: {type,subjectName,topicName,covered:boolean}

Interpret dayOfWeek as Sunday=0 through Saturday=6.
For homework/tutes, create one assignment plus useful subtasks when the task is visible or clearly stated.
For images/PDFs/audio, extract only information supported by the attachment or the student's message. If a date/mark/time is unclear, ask the student in reply rather than inventing it.
When the student asks to 'change my plan', prefer update_plan/profile/class/exam/assignment actions instead of returning a generic study plan in prose.
If no database/app change is needed, return actions: [].
Return ONLY JSON with this exact top-level shape:
{"reply":"short helpful response","transcript":null,"actions":[],"confidence":0.0}
confidence must be 0 to 1. transcript should contain a concise transcription only when audio was provided, otherwise null.`;

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
    if (!apiKey) return new Response(JSON.stringify({ error: "gemini_not_configured", message: "StudyArc AI is ready, but the GEMINI_API_KEY Supabase secret has not been added yet." }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });

    const body = await req.json();
    const message = String(body?.message ?? "").trim();
    const attachment = body?.attachment ?? null;
    const audio = body?.audio ?? null;
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const context = body?.context && typeof body.context === "object" ? body.context : {};
    const localNow = String(body?.localNow ?? new Date().toString());
    const timezoneOffsetMinutes = Number(body?.timezoneOffsetMinutes ?? 0);

    if (!message && !attachment?.base64 && !audio?.base64) return new Response(JSON.stringify({ error: "empty_request", message: "Type a message or attach a file/voice message." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const parts: any[] = [{
      text: `${SYSTEM}\n\nStudent local time: ${localNow}\nTimezone offset minutes: ${timezoneOffsetMinutes}\n\nRecent chat:\n${JSON.stringify(history)}\n\nCurrent StudyArc context:\n${JSON.stringify(context)}\n\nStudent message:\n${message || "(No typed message; interpret the attachment.)"}`,
    }];

    if (attachment?.base64) {
      const base64 = String(attachment.base64);
      if (base64.length > 24_000_000) throw new Error("Attachment is too large for StudyArc AI.");
      parts.push({ inlineData: { mimeType: String(attachment.mimeType ?? "image/jpeg"), data: base64 } });
    }
    if (audio?.base64) {
      const base64 = String(audio.base64);
      if (base64.length > 24_000_000) throw new Error("Voice message is too large for StudyArc AI.");
      parts.push({ inlineData: { mimeType: String(audio.mimeType ?? "audio/mp4"), data: base64 } });
    }

    const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message ?? `Gemini request failed (${response.status}).`);
    const parsed = parseJson(textFromResponse(payload));
    const result = {
      reply: typeof parsed?.reply === "string" ? parsed.reply : "I prepared the changes I could understand.",
      transcript: typeof parsed?.transcript === "string" ? parsed.transcript : null,
      actions: Array.isArray(parsed?.actions) ? parsed.actions.slice(0, 30) : [],
      confidence: Math.max(0, Math.min(1, Number(parsed?.confidence ?? 0.5))),
    };
    return new Response(JSON.stringify(result), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: "ai_failed", message: error instanceof Error ? error.message : "StudyArc AI could not process that request." }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
