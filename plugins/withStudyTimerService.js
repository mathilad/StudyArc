const { withAndroidManifest, withDangerousMod, withMainApplication } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE_PATH = path.join("com", "studyarc", "app");

function addPermission(manifest, name) {
  manifest["uses-permission"] = manifest["uses-permission"] || [];
  if (!manifest["uses-permission"].some(item => item.$?.["android:name"] === name)) {
    manifest["uses-permission"].push({ $: { "android:name": name } });
  }
}

module.exports = function withStudyTimerService(config) {
  config = withAndroidManifest(config, mod => {
    const manifest = mod.modResults.manifest;
    addPermission(manifest, "android.permission.POST_NOTIFICATIONS");
    addPermission(manifest, "android.permission.FOREGROUND_SERVICE");
    addPermission(manifest, "android.permission.FOREGROUND_SERVICE_SPECIAL_USE");

    const application = manifest.application?.[0];
    if (!application) throw new Error("StudyTimerService: Android application manifest node was not found.");
    application.service = application.service || [];
    if (!application.service.some(item => item.$?.["android:name"] === ".StudyTimerService")) {
      application.service.push({
        $: {
          "android:name": ".StudyTimerService",
          "android:exported": "false",
          "android:foregroundServiceType": "specialUse",
        },
        property: [{
          $: {
            "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
            "android:value": "Study stopwatch timer with persistent notification controls",
          },
        }],
      });
    }
    return mod;
  });

  config = withMainApplication(config, mod => {
    const marker = "PackageList(this).packages.apply {";
    if (!mod.modResults.contents.includes("StudyTimerPackage()")) {
      if (!mod.modResults.contents.includes(marker)) throw new Error("StudyTimerService: could not register StudyTimerPackage in MainApplication.");
      mod.modResults.contents = mod.modResults.contents.replace(marker, `${marker}\n          add(StudyTimerPackage())`);
    }
    return mod;
  });

  config = withDangerousMod(config, ["android", async mod => {
    const dir = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "java", PACKAGE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "StudyTimerService.java"), SERVICE_SOURCE);
    fs.writeFileSync(path.join(dir, "StudyTimerModule.java"), MODULE_SOURCE);
    fs.writeFileSync(path.join(dir, "StudyTimerPackage.java"), PACKAGE_SOURCE);
    return mod;
  }]);
  return config;
};

const SERVICE_SOURCE = String.raw`package com.studyarc.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;

public class StudyTimerService extends Service {
  public static final String PREFS = "study_timer_native";
  public static final String CHANNEL_ID = "study-timer";
  public static final int NOTIFICATION_ID = 7416;
  public static final String ACTION_IDLE = "com.studyarc.timer.IDLE";
  public static final String ACTION_SYNC_START = "com.studyarc.timer.SYNC_START";
  public static final String ACTION_SYNC_PAUSE = "com.studyarc.timer.SYNC_PAUSE";
  public static final String ACTION_NOTIFY_START = "com.studyarc.timer.NOTIFY_START";
  public static final String ACTION_NOTIFY_PAUSE = "com.studyarc.timer.NOTIFY_PAUSE";
  public static final String ACTION_NOTIFY_STOP = "com.studyarc.timer.NOTIFY_STOP";
  public static final String ACTION_RESET = "com.studyarc.timer.RESET";
  public static final String ACTION_HIDE = "com.studyarc.timer.HIDE";

  private SharedPreferences prefs;

  @Override public void onCreate() {
    super.onCreate();
    prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
    createChannel();
  }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    if (prefs == null) prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
    String action = intent == null ? null : intent.getAction();
    if (ACTION_HIDE.equals(action)) {
      prefs.edit().putBoolean("enabled", false).putLong("updatedAt", System.currentTimeMillis()).apply();
      if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true);
      stopSelf();
      return START_NOT_STICKY;
    }

    if (intent != null) updateMeta(intent);
    if (ACTION_SYNC_START.equals(action)) {
      writeState(intent.getLongExtra("elapsed", 0L), true, false);
    } else if (ACTION_SYNC_PAUSE.equals(action)) {
      writeState(intent.getLongExtra("elapsed", 0L), false, false);
    } else if (ACTION_NOTIFY_START.equals(action)) {
      writeState(readElapsed(), true, false);
    } else if (ACTION_NOTIFY_PAUSE.equals(action)) {
      writeState(readElapsed(), false, false);
    } else if (ACTION_NOTIFY_STOP.equals(action)) {
      writeState(readElapsed(), false, true);
    } else if (ACTION_RESET.equals(action)) {
      writeState(0L, false, false);
    } else if (ACTION_IDLE.equals(action)) {
      prefs.edit().putBoolean("enabled", true).putLong("updatedAt", System.currentTimeMillis()).apply();
    }

    if (!prefs.getBoolean("enabled", true)) {
      stopSelf();
      return START_NOT_STICKY;
    }
    prefs.edit().putBoolean("enabled", true).apply();
    startForeground(NOTIFICATION_ID, buildNotification());
    return START_STICKY;
  }

  private void updateMeta(Intent intent) {
    SharedPreferences.Editor editor = prefs.edit();
    if (intent.hasExtra("subject")) editor.putString("subject", intent.getStringExtra("subject"));
    if (intent.hasExtra("topic")) editor.putString("topic", intent.getStringExtra("topic"));
    editor.apply();
  }

  private void writeState(long elapsed, boolean running, boolean stopped) {
    long now = System.currentTimeMillis();
    prefs.edit()
      .putLong("elapsed", Math.max(0L, elapsed))
      .putLong("startedAt", running ? now : 0L)
      .putBoolean("running", running)
      .putBoolean("stopped", stopped)
      .putBoolean("enabled", true)
      .putLong("updatedAt", now)
      .apply();
  }

  private long readElapsed() {
    long elapsed = Math.max(0L, prefs.getLong("elapsed", 0L));
    if (!prefs.getBoolean("running", false)) return elapsed;
    long startedAt = prefs.getLong("startedAt", System.currentTimeMillis());
    return elapsed + Math.max(0L, System.currentTimeMillis() - startedAt);
  }

  private Notification buildNotification() {
    long elapsed = readElapsed();
    boolean running = prefs.getBoolean("running", false);
    boolean stopped = prefs.getBoolean("stopped", false);
    String subject = prefs.getString("subject", null);
    String topic = prefs.getString("topic", null);
    String detail = subject == null || subject.length() == 0 ? "General study" : subject;
    if (topic != null && topic.length() > 0 && !"General".equals(topic)) detail += " · " + topic;

    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
      ? new Notification.Builder(this, CHANNEL_ID)
      : new Notification.Builder(this);
    builder
      .setSmallIcon(getApplicationInfo().icon)
      .setContentTitle(running ? "Study timer running" : stopped ? "Study timer stopped" : elapsed > 0 ? "Study timer paused" : "Study timer ready")
      .setContentText(running ? detail : formatElapsed(elapsed) + " · " + detail)
      .setContentIntent(openAppIntent())
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setAutoCancel(false)
      .setCategory(Notification.CATEGORY_STOPWATCH)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setShowWhen(true);

    if (running) {
      builder.setUsesChronometer(true).setWhen(System.currentTimeMillis() - elapsed);
      builder.addAction(new Notification.Action.Builder(android.R.drawable.ic_media_pause, "Pause", actionIntent(ACTION_NOTIFY_PAUSE)).build());
      builder.addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, "Stop", actionIntent(ACTION_NOTIFY_STOP)).build());
    } else {
      builder.setUsesChronometer(false).setWhen(System.currentTimeMillis());
      builder.addAction(new Notification.Action.Builder(android.R.drawable.ic_media_play, elapsed > 0 ? "Resume" : "Start", actionIntent(ACTION_NOTIFY_START)).build());
      if (elapsed > 0 && !stopped) builder.addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, "Stop", actionIntent(ACTION_NOTIFY_STOP)).build());
      builder.addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_view, "Open", openAppIntent()).build());
    }
    return builder.build();
  }

  private PendingIntent actionIntent(String action) {
    Intent intent = new Intent(this, StudyTimerService.class).setAction(action);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
    return PendingIntent.getService(this, action.hashCode(), intent, flags);
  }

  private PendingIntent openAppIntent() {
    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("studyarc://stopwatch"));
    intent.setPackage(getPackageName());
    intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
    return PendingIntent.getActivity(this, 7417, intent, flags);
  }

  private void createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Study timer", NotificationManager.IMPORTANCE_LOW);
    channel.setDescription("Persistent Study Arc stopwatch controls");
    channel.setSound(null, null);
    channel.enableVibration(false);
    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    manager.createNotificationChannel(channel);
  }

  private String formatElapsed(long millis) {
    long total = Math.max(0L, millis / 1000L);
    long hours = total / 3600L;
    long minutes = (total % 3600L) / 60L;
    long seconds = total % 60L;
    return String.format(java.util.Locale.US, "%02d:%02d:%02d", hours, minutes, seconds);
  }

  @Override public IBinder onBind(Intent intent) { return null; }
}`;

const MODULE_SOURCE = String.raw`package com.studyarc.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

public class StudyTimerModule extends ReactContextBaseJavaModule {
  private final ReactApplicationContext context;
  public StudyTimerModule(ReactApplicationContext context) { super(context); this.context = context; }
  @Override public String getName() { return "StudyTimer"; }

  @ReactMethod public void showIdle(String subject, String topic, Promise promise) { send(StudyTimerService.ACTION_IDLE, 0L, false, subject, topic, true, promise); }
  @ReactMethod public void syncTimer(double elapsed, boolean running, String subject, String topic, Promise promise) { send(running ? StudyTimerService.ACTION_SYNC_START : StudyTimerService.ACTION_SYNC_PAUSE, Math.max(0L, (long) elapsed), true, subject, topic, true, promise); }
  @ReactMethod public void hideTimer(Promise promise) { send(StudyTimerService.ACTION_HIDE, 0L, false, null, null, false, promise); }
  @ReactMethod public void resetTimer(Promise promise) { send(StudyTimerService.ACTION_RESET, 0L, false, null, null, true, promise); }

  @ReactMethod public void getState(Promise promise) {
    try {
      SharedPreferences prefs = context.getSharedPreferences(StudyTimerService.PREFS, Context.MODE_PRIVATE);
      long elapsed = Math.max(0L, prefs.getLong("elapsed", 0L));
      boolean running = prefs.getBoolean("running", false);
      if (running) elapsed += Math.max(0L, System.currentTimeMillis() - prefs.getLong("startedAt", System.currentTimeMillis()));
      WritableMap map = Arguments.createMap();
      map.putBoolean("enabled", prefs.getBoolean("enabled", false));
      map.putBoolean("running", running);
      map.putBoolean("stopped", prefs.getBoolean("stopped", false));
      map.putDouble("elapsedMilliseconds", (double) elapsed);
      map.putString("subjectName", prefs.getString("subject", null));
      map.putString("topicName", prefs.getString("topic", null));
      map.putDouble("updatedAtEpoch", (double) prefs.getLong("updatedAt", 0L));
      promise.resolve(map);
    } catch (Exception error) { promise.reject("study_timer_state", error); }
  }

  private void send(String action, long elapsed, boolean includeElapsed, String subject, String topic, boolean foreground, Promise promise) {
    try {
      Intent intent = new Intent(context, StudyTimerService.class).setAction(action);
      if (includeElapsed) intent.putExtra("elapsed", elapsed);
      if (subject != null) intent.putExtra("subject", subject);
      if (topic != null) intent.putExtra("topic", topic);
      if (foreground && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent); else context.startService(intent);
      promise.resolve(null);
    } catch (Exception error) { promise.reject("study_timer_service", error); }
  }
}`;

const PACKAGE_SOURCE = String.raw`package com.studyarc.app;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.Collections;
import java.util.List;

public class StudyTimerPackage implements ReactPackage {
  @Override public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    return Collections.<NativeModule>singletonList(new StudyTimerModule(reactContext));
  }
  @Override public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}`;
