# Study Arc Supabase setup

The app is configured with the Supabase project URL and publishable key in `.env`.

## 1. Rotate the secret key that was exposed previously

A Supabase secret key was previously pasted into chat. Revoke/rotate it in Supabase. **Do not put the replacement in this app.** The Expo/web client only needs the publishable key.

## 2. Run the upgraded database schema

Open:

**Supabase Dashboard -> SQL Editor -> New query**

Paste the complete contents of:

`supabase/schema.sql`

and press **Run**.

It is written to be safe to re-run and creates/upgrades:

- `student_profiles`
- `class_schedules`
- `test_marks` (raw MCQ/Essay score + total, with normalized percentages for analytics)
- `syllabus_coverage` (manual/class-end lesson subtopic coverage)
- `topic_progress`
- `study_sessions`
- `study_laps`
- `avatars` Storage bucket
- `social_profiles`
- `daily_study_rankings`
- `friendships`
- `study_presence`
- `contact_messages`
- realtime publication entries for ranking/friends/presence
- indexes
- Row Level Security policies

The session table is also upgraded with optional focus/understanding ratings and repeatable past-paper metadata: paper year, section and attempt number.

## 3. Authentication

In **Authentication -> Providers -> Email** enable Email authentication.

For production, keeping email confirmation enabled is recommended.

In **Authentication -> URL Configuration**, add native redirects:

- `studyarc://login`
- `studyarc://reset-password`

For a deployed web build also add the actual web URLs, for example:

- `https://YOUR_DOMAIN/login`
- `https://YOUR_DOMAIN/reset-password`

## 4. Environment variables

The app expects:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Do not add any `SUPABASE_SECRET_KEY`, service-role key or database password to Expo client code.

## 5. Run

On Windows you can double-click `INSTALL_WINDOWS.bat`, or:

```bat
npm start
```

The start script now installs dependencies automatically when `node_modules` is missing.

Manual equivalent:

```bat
npm install
npx expo start -c
```

Web:

```bat
npm run web
```

## 6. Cloud data model

Each signed-in user gets isolated data through RLS:

- profile and selected A/L subjects
- exam year, wake/sleep times, self-study target
- class schedule, mode, travel and pre-class review duration
- MCQ/Essay test marks and weak topics
- topic mastery and spaced-recall timestamps
- stopwatch sessions and laps
- repeated past-paper attempts
- optional focus/understanding reflection
- profile avatar metadata
- minimal social profile + daily study ranking
- friend relationships and studying-now presence
- private support-message log

This makes Supabase the long-term source of truth while the planner/analytics are generated from those records in the app.

## 7. Social privacy

The social tables intentionally expose only display name/avatar/friend code, daily study total and a short studying-now presence. Full study sessions, marks, notes and topic history remain protected by the original per-user RLS policies.

## 8. Contact Us email

The app logs the message to `contact_messages`, then opens the device email composer addressed to `mathiladinimuthu3@gmail.com`. Do not add an email-provider API secret to Expo. If automatic server-side email is added later, store that provider secret in a Supabase Edge Function secret instead.

## Offline-first + daily reviews
Re-run `supabase/schema.sql` after updating to this build. It adds the `daily_reviews` table and RLS policies. Offline data itself lives locally on each device in AsyncStorage; queued changes are uploaded automatically after connectivity returns.


## Latest marks + syllabus coverage upgrade
Run the complete `supabase/schema.sql` again for this build. It adds decimal-capable `mcq_score`, `mcq_total`, `essay_score`, and `essay_total` columns and the `syllabus_coverage` table. Existing percentage-only test rows remain readable; new test results store the real mark and the total available mark.
