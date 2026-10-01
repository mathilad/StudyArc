# Private GitHub audio recall storage

The app sends requests to the `audio-recall-github` Supabase Edge Function. It verifies the user's Supabase Auth session, derives their folder from that identity, and stores audio and a recording index in a **private** GitHub repository. No GitHub credential goes into the app, the public StudyArc source, or the recording response. No additional database tables are required.

## Required administrator setup

1. Create a dedicated private repository (for example `mathilad/StudyArcAudio`) and initialize it with a README. Keep access limited to trusted administrators.
2. Create a fine-grained GitHub personal access token scoped only to that repository, with **Contents: Read and write**. Give it an expiry and renew it before it expires. Do not paste this token into chat, commit it, or put it in an `EXPO_PUBLIC_*` variable.
3. In the Focus Supabase project, open **Edge Functions → Secrets** and add:
   - `GITHUB_AUDIO_REPOSITORY`: the exact `owner/repository` name.
   - `GITHUB_AUDIO_TOKEN`: the token from step 2.
4. The deployed `audio-recall-github` function must keep JWT verification enabled. Users sign in normally to StudyArc, open Audio Recall, and tap Refresh. Then record a short note and confirm it says **Synced to GitHub**. Sign in to the same account on another device and play that note.

The function refuses public repositories and reports setup errors without discarding local recordings. Without these two secrets, GitHub sync is **not active**.

## Storage behavior

- New notes save locally first; uploaded notes sync across devices. The web client keeps local audio in IndexedDB, avoiding expired blob URLs after page reloads.
- Notes from the older shared device-only library require explicit individual upload; they are not automatically assigned or uploaded to an account.
- Offline/upload failures leave device-only notes available with a retry control. Playback downloads through the authenticated function; private GitHub download URLs and tokens are not handed to clients.
- Removing a synced note creates an index tombstone, preventing older devices from uploading it again, and attempts to remove the current audio file. **GitHub retains earlier commits and may retain the recording in repository history.** Library deletion is not a guaranteed permanent erase from GitHub.
- Initial limits: 10 MB per recording, 1,000 index entries, and 200 MB of indexed audio per account (including tombstones). GitHub API rate limits and repository history size also apply. This is a private repository integration, not a general-purpose high-volume media platform.

## Verification

Run `node --test tests/*.test.cjs`, `npx tsc --noEmit`, and the Expo web export. Backend tests cover private-repository enforcement, account isolation, conflict retries, cross-device reads, and deletion tombstones. A live authenticated upload/playback check is still required after the administrator configures the secrets.
