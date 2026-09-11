const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE_PATH = path.join("com", "studyarc", "app");

module.exports = function withStudyArcNotificationBranding(config) {
  return withDangerousMod(config, ["android", async mod => {
    const file = path.join(
      mod.modRequest.platformProjectRoot,
      "app",
      "src",
      "main",
      "java",
      PACKAGE_PATH,
      "StudyTimerService.java",
    );

    if (!fs.existsSync(file)) {
      throw new Error("StudyArc notification branding: StudyTimerService.java was not generated.");
    }

    let source = fs.readFileSync(file, "utf8");

    source = source.replace(
      '.setContentTitle(running ? "Study timer running" : stopped ? "Study timer stopped" : elapsed > 0 ? "Study timer paused" : "Study timer ready")',
      '.setContentTitle(running ? "StudyArc · Timer running" : stopped ? "StudyArc · Timer stopped" : elapsed > 0 ? "StudyArc · Timer paused" : "StudyArc · Timer ready")',
    );

    source = source.replace(
      '.setVisibility(Notification.VISIBILITY_PUBLIC)\n      .setShowWhen(true);',
      '.setVisibility(Notification.VISIBILITY_PUBLIC)\n      .setSubText("StudyArc")\n      .setShowWhen(true);',
    );

    source = source.replace(
      'new NotificationChannel(CHANNEL_ID, "Study timer", NotificationManager.IMPORTANCE_LOW)',
      'new NotificationChannel(CHANNEL_ID, "StudyArc · Study timer", NotificationManager.IMPORTANCE_LOW)',
    );

    source = source.replace(
      'channel.setDescription("Persistent Study Arc stopwatch controls")',
      'channel.setDescription("Persistent StudyArc stopwatch controls")',
    );

    fs.writeFileSync(file, source);
    return mod;
  }]);
};
