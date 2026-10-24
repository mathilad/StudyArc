-- StudyArc Cloudflare D1 schema.
-- Additive Cloudflare-only migration. This does not modify Supabase.
-- Arrays from PostgreSQL are stored as JSON text in D1.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  study_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
  focus_rating INTEGER,
  understanding_rating INTEGER,
  paper_year INTEGER,
  paper_section TEXT,
  attempt_no INTEGER,
  session_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (focus_rating IS NULL OR focus_rating BETWEEN 1 AND 5),
  CHECK (understanding_rating IS NULL OR understanding_rating BETWEEN 1 AND 5),
  CHECK (paper_section IS NULL OR paper_section IN ('MCQ','Essay','Full Paper'))
);
CREATE INDEX IF NOT EXISTS study_sessions_user_started_idx ON study_sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS study_laps (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  lap_number INTEGER NOT NULL CHECK (lap_number > 0),
  duration_milliseconds INTEGER NOT NULL CHECK (duration_milliseconds >= 0),
  total_milliseconds INTEGER NOT NULL CHECK (total_milliseconds >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(session_id, lap_number)
);
CREATE INDEX IF NOT EXISTS study_laps_session_number_idx ON study_laps(session_id, lap_number);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  school TEXT,
  district TEXT,
  exam_year INTEGER,
  wake_time TEXT NOT NULL DEFAULT '06:00',
  sleep_time TEXT NOT NULL DEFAULT '22:30',
  self_study_hours REAL NOT NULL DEFAULT 3.0,
  subject_choices TEXT NOT NULL DEFAULT '[]',
  medium TEXT NOT NULL DEFAULT 'English' CHECK (medium IN ('English','Sinhala')),
  avatar_url TEXT,
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS class_schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Class',
  class_type TEXT NOT NULL DEFAULT 'Theory' CHECK (class_type IN ('Theory','Revision','Paper','Extra Class')),
  delivery_mode TEXT NOT NULL DEFAULT 'Physical' CHECK (delivery_mode IN ('Physical','Online')),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  pre_review_minutes INTEGER NOT NULL DEFAULT 30 CHECK (pre_review_minutes BETWEEN 0 AND 180),
  travel_minutes INTEGER NOT NULL DEFAULT 90 CHECK (travel_minutes BETWEEN 0 AND 240),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS class_schedules_user_day_idx ON class_schedules(user_id, day_of_week, start_time);

CREATE TABLE IF NOT EXISTS class_learning_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  occurrence_key TEXT NOT NULL,
  class_id TEXT REFERENCES class_schedules(id) ON DELETE SET NULL,
  occurrence_date TEXT NOT NULL DEFAULT (date('now')),
  subject_name TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  subtopic_names TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, occurrence_key)
);
CREATE INDEX IF NOT EXISTS class_learning_records_user_date_idx ON class_learning_records(user_id, occurrence_date DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS test_marks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  test_date TEXT NOT NULL DEFAULT (date('now')),
  title TEXT NOT NULL DEFAULT 'Class test',
  mcq_percent REAL CHECK (mcq_percent IS NULL OR mcq_percent BETWEEN 0 AND 100),
  essay_percent REAL CHECK (essay_percent IS NULL OR essay_percent BETWEEN 0 AND 100),
  weak_topics TEXT NOT NULL DEFAULT '[]',
  mcq_score REAL,
  mcq_total REAL,
  essay_score REAL,
  essay_total REAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ((mcq_score IS NULL AND mcq_total IS NULL) OR (mcq_score >= 0 AND mcq_total > 0 AND mcq_score <= mcq_total)),
  CHECK ((essay_score IS NULL AND essay_total IS NULL) OR (essay_score >= 0 AND essay_total > 0 AND essay_score <= essay_total))
);
CREATE INDEX IF NOT EXISTS test_marks_user_date_idx ON test_marks(user_id, test_date DESC);

CREATE TABLE IF NOT EXISTS topic_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  coverage INTEGER NOT NULL DEFAULT 0 CHECK (coverage BETWEEN 0 AND 100),
  knowledge INTEGER NOT NULL DEFAULT 0 CHECK (knowledge BETWEEN 0 AND 100),
  memory INTEGER NOT NULL DEFAULT 0 CHECK (memory BETWEEN 0 AND 100),
  performance INTEGER NOT NULL DEFAULT 0 CHECK (performance BETWEEN 0 AND 100),
  last_studied_at TEXT,
  next_recall_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, subject_name, topic_name)
);
CREATE INDEX IF NOT EXISTS topic_progress_user_subject_idx ON topic_progress(user_id, subject_name);

CREATE TABLE IF NOT EXISTS syllabus_coverage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  subtopic_name TEXT NOT NULL,
  covered INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'Manual' CHECK (source IN ('Manual','Class')),
  covered_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, subject_name, topic_name, subtopic_name)
);
CREATE INDEX IF NOT EXISTS syllabus_coverage_user_subject_idx ON syllabus_coverage(user_id, subject_name, topic_name);

CREATE TABLE IF NOT EXISTS past_paper_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  paper_year INTEGER NOT NULL CHECK (paper_year BETWEEN 1950 AND 2100),
  paper_section TEXT NOT NULL CHECK (paper_section IN ('MCQ','Essay','Full Paper')),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 0 AND 100),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, subject_name, paper_year, paper_section)
);
CREATE INDEX IF NOT EXISTS past_paper_history_user_subject_year_idx ON past_paper_history(user_id, subject_name, paper_year DESC);

CREATE TABLE IF NOT EXISTS past_paper_item_ticks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  paper_year INTEGER NOT NULL CHECK (paper_year BETWEEN 1950 AND 2100),
  paper_section TEXT NOT NULL,
  item_key TEXT NOT NULL,
  topic_name TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','incorrect','review')),
  attempt_no INTEGER NOT NULL DEFAULT 1 CHECK (attempt_no >= 1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS past_paper_item_ticks_user_lookup_idx ON past_paper_item_ticks(user_id, subject_name, paper_section, paper_year DESC);

CREATE TABLE IF NOT EXISTS social_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'Student',
  avatar_url TEXT,
  friend_code TEXT NOT NULL UNIQUE,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS daily_study_rankings (
  user_id TEXT NOT NULL,
  study_date TEXT NOT NULL,
  study_seconds INTEGER NOT NULL DEFAULT 0 CHECK (study_seconds >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(user_id, study_date)
);

CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  addressee_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (requester_id <> addressee_id),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS study_presence (
  user_id TEXT PRIMARY KEY,
  is_studying INTEGER NOT NULL DEFAULT 0,
  subject_name TEXT,
  topic_name TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS daily_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  review_date TEXT NOT NULL,
  completed_blocks INTEGER NOT NULL DEFAULT 0 CHECK (completed_blocks >= 0),
  day_rating INTEGER NOT NULL DEFAULT 3 CHECK (day_rating BETWEEN 1 AND 5),
  attention_topics TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, review_date)
);
CREATE INDEX IF NOT EXISTS daily_reviews_user_date_idx ON daily_reviews(user_id, review_date DESC);
