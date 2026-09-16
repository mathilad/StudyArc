# Access and study-flow update

Implemented activation routing to the animated plan screen without an account-age cutoff; direct minute entry (00–59); home-page Revise labels; light/dark timetable export selection; calendar-month Premium grants and user-bound keys; subject filtering in paper performance; signup app/web destinations editable by admins; verified-email success messaging; login branding; and hiding the offline banner on stopwatch routes.

Premium extensions start at the later of today or the current active expiry. The key redemption window is separate from the Premium duration. Existing activation-code APIs remain compatible.

The callback is now generated into the web export. It verifies signup tokens, shows errors rather than false success, and passes only an account-created flag to configured destinations. A successful mobile handoff cancels website fallback. Changing email-provider tracking settings and testing a real newly delivered confirmation email remain outside the verified checks.

## Catalogue coverage

The database now contains 217 lessons and 905 subtopics across 25 subject tracks, including Pure and Applied Mathematics. Stable bundled lesson names are preserved. Missing remote subtopics fall back to bundled details; explicit administrator-disabled subtopics stay disabled. Paginated reads prevent a 1,000-row response limit from hiding future entries.

The expansion adds 126 lesson outlines and 498 subtopics for 18 additional subjects from Ministry of Education e-Thaksalawa course pages. Original Sinhala headings are retained where reviewed English translations are unavailable. Sources are recorded per topic. Course material is uneven and does not establish complete syllabus coverage; imported entries retain `needs_review` status. Subjects without suitable sourced outlines still need syllabus work. No generic exercises were presented as verified curriculum subtopics.

Sources: https://e-thaksalawa.moe.gov.lk/lcms/course/index.php?categoryid=49 and the individual course URLs in `data/officialCourseTopics.json`. Bundled science/mathematics outlines remain linked to https://nie.lk/selesyll?helixMode=edit for review.

## Verification

- TypeScript check and web export passed.
- Changed app files lint without errors; two existing timetable dependency warnings remain.
- Five callback tests passed: desktop redirect, failed mobile fallback, successful mobile handoff, expired links, and unverified tokens.
- Transaction-rolled-back database fixtures verified one- and two-month grants, extension from existing expiry, timed-code redemption and rejection of student grants.
- Anonymous users cannot execute Premium admin functions. Public pre-login settings access exposes only the two signup destination keys.
- Browser screenshot testing was unavailable because Chromium downloads timed out; no visual or real-device verification is claimed.
- No APK build was requested or run.
