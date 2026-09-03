# React hook-order fix

Fixed the runtime error:

`Rendered fewer hooks than expected. This may be caused by an accidental early return statement.`

Cause: `app/onboarding.tsx` returned a redirect before a later `useMemo` when onboarding state changed.

Fix: the `canContinue` calculation is now a normal derived value, so all hooks are always called before route-guard returns.
