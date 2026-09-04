# Study Arc Supabase email templates

These templates are the production-style Study Arc confirmation and password-recovery emails.

## Install the templates

In **Supabase Dashboard → Authentication → Email Templates**:

- paste `confirm-signup.html` into **Confirm signup**;
- paste `reset-password.html` into **Reset password / Recovery**.

Suggested subjects:

- **Confirm signup:** `Welcome to Study Arc — confirm your email`
- **Recovery:** `Reset your Study Arc password`

Both templates intentionally use `{{ .ConfirmationURL }}`. Do not replace that variable with localhost or a hard-coded website URL.

## Required native redirects

In **Authentication → URL Configuration → Redirect URLs**, add:

- `studyarc://login`
- `studyarc:///login`
- `studyarc://reset-password`
- `studyarc:///reset-password`

Study Arc uses the Expo scheme `studyarc`. These entries allow the confirmation and reset links to return to the installed app.

For a deployed web version, add that deployment's real HTTPS `/login` and `/reset-password` routes separately.
