# Study Arc Supabase setup

The Expo client uses only the Supabase project URL and publishable key. Never place a Supabase secret/service-role key in the app, APK, repository, or public environment variables.

## 1. Rotate any previously exposed secret key

If a Supabase secret key was ever pasted into a chat, log, or public location, revoke/rotate it in Supabase. The Study Arc client does **not** need that key.

## 2. Run the database schema

Open **Supabase Dashboard → SQL Editor → New query** and run the complete contents of:

`supabase/schema.sql`

For an existing Study Arc database, also run the latest idempotent migration once:

`supabase/migrations/20260904_complete_study_arc_fixes.sql`

The migration is safe to re-run. It adds the study-medium field, keeps `Extra Class` valid, and reinstalls the profile-avatar storage policies that allow each authenticated user to write only inside `avatars/<their-user-id>/...`.

The database covers:

- student profiles, name, English/Sinhala medium, exam year and daily rhythm
- weekly classes, including Theory, Revision, Paper and Extra Class
- raw MCQ/Essay marks and weak topics
- manual/class syllabus coverage
- topic progress and recall schedule
- stopwatch sessions and laps
- past-paper history
- daily reviews
- profile avatars
- social profiles, daily rankings, friendships and study presence
- private Contact Us messages
- required indexes, RLS policies and realtime publication entries

## 3. Authentication and app deep links

In **Authentication → Providers → Email**, enable Email authentication. Keeping email confirmation enabled is recommended.

In **Authentication → URL Configuration → Redirect URLs**, add all of these native Study Arc redirects:

- `studyarc://login`
- `studyarc:///login`
- `studyarc://reset-password`
- `studyarc:///reset-password`

The app scheme is `studyarc`, so confirmation and recovery links in the installed Android/iOS app return to Study Arc instead of localhost.

If you deploy a web build, add its real HTTPS routes separately, for example:

- `https://YOUR_DOMAIN/login`
- `https://YOUR_DOMAIN/reset-password`

Do not use a localhost Site URL for production email flows.

## 4. Install the Study Arc email templates

Open **Authentication → Email Templates** and paste:

- `supabase/email-templates/confirm-signup.html` into **Confirm signup**
- `supabase/email-templates/reset-password.html` into **Reset password / Recovery**

Suggested subjects:

- `Welcome to Study Arc — confirm your email`
- `Reset your Study Arc password`

Both templates use Supabase's `{{ .ConfirmationURL }}` value so the redirect configured by the app is retained.

## 5. Environment variables

Study Arc expects:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

For GitHub Actions, create repository Actions secrets with those exact two names before building the APK.

Do not add `SUPABASE_SECRET_KEY`, a service-role key, or a database password to Expo client code.

## 6. Account flow

New users now:

1. enter their name, email, password and password confirmation;
2. see a clear **Check your email** next-step screen;
3. confirm the email and return to Study Arc;
4. sign in if requested;
5. complete onboarding, including English/Sinhala medium, subjects, exam target, wake/sleep times and classes.

Study Arc persists a valid Supabase session on a trusted device. Therefore a returning user can open the app without typing the password every time. This is normal authenticated-session persistence; signing out removes that local session.

Password recovery opens the Study Arc reset screen. After the password is changed, the recovery session is signed out and the user is asked to sign in with the new password.

## 7. Profile photos

Profile photos are uploaded to the public `avatars` bucket under the signed-in user's own folder. The storage RLS policies permit insert/update/delete only when the first folder segment equals `auth.uid()`.

If an older installation showed `new row violates row-level security policy`, run `supabase/migrations/20260904_complete_study_arc_fixes.sql` and then try the photo again while signed in.

## 8. Contact Us

Contact Us no longer depends on an installed email application. Signed-in users submit the message directly to the protected `contact_messages` table. The support address shown in the app is:

`mathiladinimuthu3@gmail.com`

The message remains available to the project owner through Supabase/dashboard tooling without exposing any server email-provider secret in the Expo client.

## 9. Planner and coverage behavior

Self-study and adaptive revision work are generated only from syllabus lessons the learner has manually marked covered. Class blocks, physical travel and pre-class review remain fixed because they come from the weekly class schedule.

The planner calendar marks dates that contain saved study sessions. The Sessions tab also groups history under separate date headings.

## 10. Run locally

On Windows, double-click `INSTALL_WINDOWS.bat`, or run:

```bat
npm start
```

Manual equivalent:

```bat
npm install
npx expo start -c
```

Web:

```bat
npm run web
```

## 11. Privacy

RLS keeps each student's private profile, study history, marks, notes, syllabus progress and support messages scoped to that authenticated account. Social features expose only the minimal data required for friends/ranking/presence; private sessions and marks are not shared with other users.
