#!/usr/bin/env bash
set -euo pipefail
mkdir -p startup-diagnostics
APK=$(find android/app/build/outputs/apk/release -type f -name '*.apk' | head -n 1)
adb install -r "$APK"
adb shell dumpsys package com.studyarc.app > startup-diagnostics/package.txt
grep -E 'primaryCpuAbi=x86([[:space:]]|$)' startup-diagnostics/package.txt
adb logcat -c
adb shell am start -W -n com.studyarc.app/.StudyArcStartupActivity
ready=false
for attempt in $(seq 1 24); do
  sleep 2
  adb shell uiautomator dump /sdcard/studyarc-startup.xml > /dev/null 2>&1 || true
  adb pull /sdcard/studyarc-startup.xml startup-diagnostics/login.xml > /dev/null 2>&1 || true
  if grep -q 'Welcome back' startup-diagnostics/login.xml 2>/dev/null; then ready=true; break; fi
done
adb logcat -d > startup-diagnostics/launch-logcat.txt
adb exec-out screencap -p > startup-diagnostics/login.png
if [ "$ready" != true ]; then
  echo 'StudyArc failed to reach the login screen on 32-bit Android.'
  tail -n 250 startup-diagnostics/launch-logcat.txt
  exit 1
fi
echo 'PASS: release APK reaches login on 32-bit Android.'
# Verify recovery using an intentional Java crash on the disposable emulator.
adb shell am crash com.studyarc.app
sleep 3
adb shell input keyevent KEYCODE_BACK
adb shell am start -W -n com.studyarc.app/.StudyArcStartupActivity
sleep 2
adb shell uiautomator dump /sdcard/studyarc-recovery.xml
adb pull /sdcard/studyarc-recovery.xml startup-diagnostics/recovery.xml
adb exec-out screencap -p > startup-diagnostics/recovery.png
grep -q 'Copy crash report' startup-diagnostics/recovery.xml
grep -qi 'shell-induced crash' startup-diagnostics/recovery.xml
echo 'PASS: a captured Java crash opens a native recovery report.'
grep -q 'Process: 32-bit' startup-diagnostics/recovery.xml
