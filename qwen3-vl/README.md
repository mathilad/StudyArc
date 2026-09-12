# StudyArc Qwen3-VL engine

StudyArc now supports `Qwen/Qwen3-VL-4B-Instruct` through an OpenAI-compatible vLLM endpoint. The mobile app never receives the model server key. The flow is:

`StudyArc app -> Supabase studyarc-vision -> Qwen3-VL -> StudyArc adaptive planner`

The Qwen model is not bundled inside the APK because the 4B model files are several gigabytes and require far more memory/compute than a normal phone should be expected to provide. Run it on a PC/server with a supported GPU, then let the existing Supabase Edge Function call it.

## 1. Start the model

Copy `.env.example` to `.env` and replace `QWEN_API_KEY` with a long random secret. Then run:

```bash
docker compose up -d
```

The included compose file starts the official vLLM OpenAI-compatible server with:

```text
Qwen/Qwen3-VL-4B-Instruct
```

Local API base URL:

```text
http://localhost:8000
```

For StudyArc production use, expose the server through a secure HTTPS address. Do not expose an unauthenticated model endpoint to the public internet.

## 2. Configure Supabase Edge Function secrets

Set these secrets on the StudyArc Supabase project:

```text
QWEN_VL_BASE_URL=https://YOUR-QWEN-SERVER
QWEN_VL_MODEL=Qwen/Qwen3-VL-4B-Instruct
QWEN_VL_API_KEY=THE-SAME-QWEN_API_KEY
```

You may use `QWEN_VL_CHAT_URL` instead of `QWEN_VL_BASE_URL` when you want to provide the exact `/v1/chat/completions` endpoint.

Do not place these values in `EXPO_PUBLIC_*`, `app.json`, or client-side React Native code.

## 3. What is already connected

After Qwen returns an answer-sheet analysis, StudyArc already connects the result to:

- exact subject / lesson / subtopic matching against the hard-coded StudyArc syllabus catalog;
- question-by-question marks and feedback;
- Mistake Book creation for weak scored questions;
- topic performance updates;
- adaptive revision dates and revision notifications;
- automatic weekly subject-time adjustment;
- Overall Analysis and Paper Performance screens;
- stored scan history in `capture_analyses`.

StudyArc deliberately does not invent marks when no reliable marking reference exists. In that case Qwen can still identify lessons, weak areas, incomplete answers and misconceptions, but the planner does not treat uncertain grading as a real score.

## 4. Fallback behavior

The Edge Function uses Qwen3-VL whenever `QWEN_VL_BASE_URL` or `QWEN_VL_CHAT_URL` is configured. If Qwen fails and an existing `GEMINI_API_KEY` is configured, StudyArc can temporarily fall back to Gemini so scans do not stop working. If no Qwen endpoint and no fallback provider are configured, the app returns a clear configuration error instead of silently fabricating an analysis.
