# Study Arc

Study Arc is a dark-mode Expo + React Native G.C.E. A/L study planner backed by Supabase.

## Included in this build

- Email authentication, password reset and persistent login
- Question-by-question onboarding with A/L subject combinations
- 12-hour wake/sleep and class-time pickers
- Full syllabus lesson cards with subtopic lists
- Biology-focused spaced memory/recall scheduling
- Adaptive whole-day timetable with breaks, meals and routines
- At least 3 hours of lesson study when the available day permits
- Full Work Mode automatically during the final 30 days before the selected exam
- Theory / Revision / Paper / Extra Class classes
- Physical / Online class modes
- Automatic pre-class review
- Automatic 1 hr 30 min travel before and after physical classes
- Study, revision and class notifications plus an in-app notification center
- Daily study-time leaderboard
- Friends, friend requests and "studying now" presence
- Timestamp-persisted stopwatch that stays accurate while the app is backgrounded/reopened
- Milliseconds, laps and independent current-lap reset
- Optional post-session focus/understanding reflection
- Deletable saved sessions
- Repeatable past papers and manual previous-paper history
- MCQ/Essay test result tracking using real decimal score / total values, with weak-topic prioritization
- Manual Covered / Not covered lesson-subtopic tracking plus automatic mastery states (no coverage sliders)
- Traditional calendar, weekly subject-time overview and filters
- Per-subject analytics
- Profile details and avatar
- 12-hour bonus-work unlock that generates priority work after 12 recorded study hours in the day
- Study Arc animated startup loader
- About and Contact Us screens; support address: mathiladinimuthu3@gmail.com
- Android package and iOS bundle identifier: `com.studyarc.app`

## First run on Windows

You can double-click `INSTALL_WINDOWS.bat`, or open Command Prompt in this folder and run:

```bat
npm start
```

The start script checks whether the local Expo package exists. If `node_modules` is missing, it runs `npm install` first and then launches Expo.

Manual equivalent:

```bat
npm install
npx expo start -c
```

## Required Supabase upgrade

Run the complete current `supabase/schema.sql` in **Supabase Dashboard -> SQL Editor** before using this build. It adds the social leaderboard/friends/presence and support-message tables in addition to the existing study data tables.

See `DATABASE_SETUP.md` for the exact steps.

## Contact email behavior

The Contact Us page stores a support-message copy in Supabase and opens the device's email composer addressed to `mathiladinimuthu3@gmail.com`. Fully automatic server-side email delivery requires a transactional-email provider/Edge Function credential and is intentionally not implemented with a secret inside the mobile client.

## Security

Only the Supabase publishable client key belongs in this app. Never put a Supabase secret/service-role key, database password, or transactional-email secret in Expo client code.

## Offline-first mode
Study Arc now keeps core student data in local AsyncStorage first and syncs queued mutations to Supabase when connectivity returns. Previously authenticated users can continue using the app offline on mobile and web/desktop. Offline-capable areas include the stopwatch, saved sessions, past-paper attempts/history, profile settings, classes, tests, topic progress, timetable/planner, revision planning, analytics derived from cached data, and daily end-of-day reviews. Social/live features show the last cached leaderboard/friend state while offline and refresh when online.

A small banner shows `Offline · saved on this device` when disconnected and shows pending sync status after the connection returns. Writes use client-generated UUIDs so retries/upserts do not create duplicate study sessions.

## Daily review
One hour before the student's configured sleep time, the Home screen and Notifications center prompt for a daily review. The review records pages studied, pages revised, completed study blocks, a 1-5 day rating, and optional attention topics selected as chips. It works offline and syncs into `daily_reviews` later.

### PC/web offline reopening
Production web exports also include a small PWA manifest and service worker (`public/sw.js`). After the web build has been opened online once, same-origin app-shell assets are cached so the Study Arc web/PC version can reopen offline. Network-only social data remains cached/read-only until connectivity returns.


## Coverage and class-end logging
Every lesson exposes its syllabus subtopics as `Covered` / `Not covered`. Students can update them manually or use **Weekly classes -> Log what this class covered** after class. Class-end reminders also link directly to that screen.

## Test marks
New test results use decimal-capable text fields for the real **mark received** and **out of** value separately for MCQ and Essay. Study Arc derives normalized percentages only for graphing/analysis; the user is never forced to enter a mark out of 100.

## Latest UI fixes
- Stopwatch displays HH:MM:SS only; milliseconds remain internal for accurate timing.
- A fresh stopwatch shows one Start Session control. Lap/Pause/Resume/Reset appear after starting.
- Stop Session uses a cross-platform in-app confirmation.
- Stopwatch back navigation returns to Today/Home while the persisted timer can continue running.
- Home exam card shows studied-today time including an unsaved active session.
- Analytics includes subject-time pie charts, 14-day subject line trends, work-type distribution, and every-lesson effort breakdowns.
- Study Arc loader, native icon, PWA icon, and browser favicon use the Study Arc logo artwork.

## Supabase branded email templates
Study Arc branded templates are included in `supabase/email-templates/`:
- `confirm-signup.html`
- `reset-password.html`

Paste them into Supabase Dashboard → Authentication → Email Templates.
