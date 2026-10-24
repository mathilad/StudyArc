export interface Env {
  DB: D1Database;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
}

const TABLES: Record<string, { columns: string[]; owner: "user_id" | "friendship" | "public-read" }> = {
  study_sessions: { owner: "user_id", columns: ["id","user_id","subject_name","topic_name","study_type","started_at","duration_seconds","focus_rating","understanding_rating","paper_year","paper_section","attempt_no","session_note","created_at"] },
  study_laps: { owner: "user_id", columns: ["id","session_id","user_id","lap_number","duration_milliseconds","total_milliseconds","created_at"] },
  student_profiles: { owner: "user_id", columns: ["user_id","full_name","school","district","exam_year","wake_time","sleep_time","self_study_hours","subject_choices","medium","avatar_url","onboarding_complete","created_at","updated_at"] },
  class_schedules: { owner: "user_id", columns: ["id","user_id","subject_name","title","class_type","delivery_mode","day_of_week","start_time","end_time","pre_review_minutes","travel_minutes","created_at"] },
  class_learning_records: { owner: "user_id", columns: ["id","user_id","occurrence_key","class_id","occurrence_date","subject_name","topic_name","subtopic_names","created_at","updated_at"] },
  test_marks: { owner: "user_id", columns: ["id","user_id","subject_name","test_date","title","mcq_percent","essay_percent","weak_topics","mcq_score","mcq_total","essay_score","essay_total","created_at"] },
  topic_progress: { owner: "user_id", columns: ["id","user_id","subject_name","topic_name","coverage","knowledge","memory","performance","last_studied_at","next_recall_at","updated_at"] },
  syllabus_coverage: { owner: "user_id", columns: ["id","user_id","subject_name","topic_name","subtopic_name","covered","source","covered_at","updated_at"] },
  past_paper_history: { owner: "user_id", columns: ["id","user_id","subject_name","paper_year","paper_section","attempts","created_at","updated_at"] },
  past_paper_item_ticks: { owner: "user_id", columns: ["id","user_id","subject_name","paper_year","paper_section","item_key","topic_name","status","attempt_no","created_at"] },
  social_profiles: { owner: "public-read", columns: ["user_id","display_name","avatar_url","friend_code","updated_at"] },
  daily_study_rankings: { owner: "public-read", columns: ["user_id","study_date","study_seconds","updated_at"] },
  friendships: { owner: "friendship", columns: ["id","requester_id","addressee_id","status","created_at","updated_at"] },
  study_presence: { owner: "public-read", columns: ["user_id","is_studying","subject_name","topic_name","updated_at"] },
  contact_messages: { owner: "user_id", columns: ["id","user_id","email","subject","message","created_at"] },
  daily_reviews: { owner: "user_id", columns: ["id","user_id","review_date","completed_blocks","day_rating","attention_topics","created_at","updated_at"] },
};

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders },
  });

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "Authorization,Content-Type",
    "vary": "Origin",
  };
}

async function getUserId(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const response = await fetch(new URL("/auth/v1/user", env.SUPABASE_URL), {
    headers: {
      authorization: auth,
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: unknown };
  return typeof user.id === "string" ? user.id : null;
}

function validIdentifier(value: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

function parseFilters(url: URL, allowedColumns: string[]): { sql: string[]; values: unknown[] } {
  const sql: string[] = [];
  const values: unknown[] = [];
  for (const [key, raw] of url.searchParams.entries()) {
    if (["select","order","limit","offset","on_conflict"].includes(key)) continue;
    if (!allowedColumns.includes(key) || !raw.startsWith("eq.")) continue;
    sql.push(`"${key}" = ?`);
    values.push(raw.slice(3));
  }
  return { sql, values };
}

function rowIsOwned(table: string, row: Record<string, unknown>, userId: string): boolean {
  const rule = TABLES[table].owner;
  if (rule === "public-read") return true;
  if (rule === "friendship") return row.requester_id === userId || row.addressee_id === userId;
  return row.user_id === userId;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      try {
        await env.DB.prepare("SELECT 1 AS ok").first();
        return json({ ok: true, service: "studyarc-data-api", database: "d1" }, 200, cors);
      } catch {
        return json({ ok: false, error: "D1 health check failed" }, 503, cors);
      }
    }

    const match = url.pathname.match(/^\/v1\/([a-z_]+)$/);
    if (!match) return json({ error: "Not found" }, 404, cors);
    const table = match[1];
    const config = TABLES[table];
    if (!config) return json({ error: "Table is not available through this API" }, 404, cors);

    let userId: string | null;
    try { userId = await getUserId(request, env); } catch { userId = null; }
    if (!userId) return json({ error: "Unauthorized" }, 401, cors);

    if (request.method === "GET") {
      const filters = parseFilters(url, config.columns);
      if (config.owner === "user_id") {
        filters.sql.push('"user_id" = ?');
        filters.values.push(userId);
      } else if (config.owner === "friendship") {
        filters.sql.push('(requester_id = ? OR addressee_id = ?)');
        filters.values.push(userId, userId);
      }
      const order = url.searchParams.get("order");
      let orderSql = "";
      if (order) {
        const [column, direction = "asc"] = order.split(".");
        if (!config.columns.includes(column) || !["asc","desc"].includes(direction)) return json({ error: "Invalid order" }, 400, cors);
        orderSql = ` ORDER BY "${column}" ${direction.toUpperCase()}`;
      }
      const limitRaw = Number(url.searchParams.get("limit") ?? "100");
      const offsetRaw = Number(url.searchParams.get("offset") ?? "0");
      const limit = Number.isInteger(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 100;
      const offset = Number.isInteger(offsetRaw) ? Math.max(0, offsetRaw) : 0;
      const where = filters.sql.length ? ` WHERE ${filters.sql.join(" AND ")}` : "";
      const statement = env.DB.prepare(`SELECT * FROM "${table}"${where}${orderSql} LIMIT ? OFFSET ?`).bind(...filters.values, limit, offset);
      const result = await statement.all();
      return json({ data: result.results ?? [], error: null }, 200, cors);
    }

    if (request.method === "POST") {
      const body = await request.json().catch(() => null) as Record<string, unknown> | Record<string, unknown>[] | null;
      if (!body || typeof body !== "object") return json({ error: "Expected a JSON object or array" }, 400, cors);
      const rows = (Array.isArray(body) ? body : [body]).map((row) => ({ ...row }));
      for (const row of rows) {
        if (config.owner === "user_id") {
          if (row.user_id !== undefined && row.user_id !== userId) return json({ error: "Forbidden owner" }, 403, cors);
          row.user_id = userId;
        } else if (config.owner === "friendship") {
          if (row.requester_id !== undefined && row.requester_id !== userId) return json({ error: "Requester must be the signed-in user" }, 403, cors);
          row.requester_id = userId;
          if (row.addressee_id === userId) return json({ error: "Cannot friend yourself" }, 400, cors);
        } else if (table === "social_profiles" || table === "study_presence") {
          if (row.user_id !== undefined && row.user_id !== userId) return json({ error: "Forbidden owner" }, 403, cors);
          row.user_id = userId;
        } else if (table === "daily_study_rankings") {
          if (row.user_id !== undefined && row.user_id !== userId) return json({ error: "Forbidden owner" }, 403, cors);
          row.user_id = userId;
        }
        if ("id" in row && (typeof row.id !== "string" || !row.id)) return json({ error: "Invalid id" }, 400, cors);
        if (!("id" in row) && config.columns.includes("id")) row.id = crypto.randomUUID();
        for (const key of Object.keys(row)) {
          if (!config.columns.includes(key) || !validIdentifier(key)) return json({ error: `Invalid column: ${key}` }, 400, cors);
          if (Array.isArray(row[key]) || (row[key] && typeof row[key] === "object")) row[key] = JSON.stringify(row[key]);
        }
      }
      const created: Record<string, unknown>[] = [];
      for (const row of rows) {
        const keys = Object.keys(row);
        if (!keys.length) return json({ error: "Empty row" }, 400, cors);
        const placeholders = keys.map(() => "?").join(", ");
        const sql = `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(", ")}) VALUES (${placeholders})`;
        try {
          await env.DB.prepare(sql).bind(...keys.map(k => row[k] ?? null)).run();
          created.push(row);
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Insert failed" }, 400, cors);
        }
      }
      return json({ data: Array.isArray(body) ? created : created[0], error: null }, 201, cors);
    }

    if (request.method === "PATCH" || request.method === "DELETE") {
      const filters = parseFilters(url, config.columns);
      if (!filters.sql.length) return json({ error: "A filter is required for update/delete" }, 400, cors);
      if (config.owner === "user_id") {
        filters.sql.push('"user_id" = ?');
        filters.values.push(userId);
      } else if (config.owner === "friendship") {
        filters.sql.push('(requester_id = ? OR addressee_id = ?)');
        filters.values.push(userId, userId);
      } else if (table === "social_profiles" || table === "study_presence" || table === "daily_study_rankings") {
        filters.sql.push('"user_id" = ?');
        filters.values.push(userId);
      }
      const where = filters.sql.join(" AND ");
      if (request.method === "DELETE") {
        const result = await env.DB.prepare(`DELETE FROM "${table}" WHERE ${where}`).bind(...filters.values).run();
        return json({ data: [], count: result.meta.changes, error: null }, 200, cors);
      }
      const body = await request.json().catch(() => null) as Record<string, unknown> | null;
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Expected a JSON object" }, 400, cors);
      const entries = Object.entries(body);
      if (!entries.length) return json({ error: "Empty update" }, 400, cors);
      for (const [key, value] of entries) {
        if (!config.columns.includes(key) || !validIdentifier(key) || key === "id" || key === "user_id") return json({ error: `Invalid update column: ${key}` }, 400, cors);
        if (Array.isArray(value) || (value && typeof value === "object")) body[key] = JSON.stringify(value);
      }
      const setSql = entries.map(([key]) => `"${key}" = ?`).join(", ");
      const values = entries.map(([key]) => body[key] ?? null);
      const result = await env.DB.prepare(`UPDATE "${table}" SET ${setSql} WHERE ${where}`).bind(...values, ...filters.values).run();
      return json({ data: [], count: result.meta.changes, error: null }, 200, cors);
    }

    return json({ error: "Method not allowed" }, 405, cors);
  },
};
