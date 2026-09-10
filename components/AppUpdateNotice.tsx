import * as Updates from "expo-updates";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";

const STARTUP_UPDATE_DELAY_MS = 1200;

/**
 * Keeps the installed native app on the latest compatible JavaScript/assets
 * release without asking the user to download another APK.
 *
 * Native-code changes still require a new binary/runtime version.
 */
export default function AppUpdateNotice() {
  const checkedThisLaunch = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || !Updates.isEnabled || checkedThisLaunch.current) {
      return;
    }

    checkedThisLaunch.current = true;
    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await Updates.checkForUpdateAsync();
          if (cancelled || !result.isAvailable) return;

          await Updates.fetchUpdateAsync();
          if (cancelled) return;

          await Updates.reloadAsync();
        } catch {
          // Update checks must never prevent the user from opening the app.
          // A later launch will automatically try the update endpoint again.
        }
      })();
    }, STARTUP_UPDATE_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return null;
}
