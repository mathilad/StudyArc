const { spawnSync } = require("node:child_process");

const run = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
  maxBuffer: 20 * 1024 * 1024,
});

let report;
try {
  report = JSON.parse(run.stdout || "{}");
} catch (error) {
  console.error("Could not parse npm audit output.");
  console.error(run.stdout || run.stderr || error);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};
const severeAdvisories = [];
for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  for (const via of vulnerability.via || []) {
    if (!via || typeof via !== "object") continue;
    if (via.severity !== "high" && via.severity !== "critical") continue;
    severeAdvisories.push({
      packageName,
      title: via.title || "unknown advisory",
      url: via.url || "",
      fixAvailable: vulnerability.fixAvailable,
    });
  }
}

// Metro currently brings image-size through Expo tooling. npm can report a
// breaking Expo-major replacement as "fixAvailable" even when the advisory is
// not safely removable inside the current Expo SDK. Keep the exception tied to
// these two reviewed advisory URLs only; any different/new image-size advisory
// and every other high/critical advisory still blocks CI.
const acceptedImageSizeUrls = new Set([
  "https://github.com/advisories/GHSA-w3rx-r6r6-pgpr",
  "https://github.com/advisories/GHSA-5p2g-fcmc-qvqq",
]);
const isReviewedImageSizeAdvisory = (item) =>
  item.packageName === "image-size" && acceptedImageSizeUrls.has(item.url);

const acceptedNoFix = severeAdvisories.filter(isReviewedImageSizeAdvisory);
const blocking = severeAdvisories.filter((item) => !isReviewedImageSizeAdvisory(item));

const metadata = report.metadata?.vulnerabilities || {};
console.log(`Production audit: ${metadata.critical || 0} critical, ${metadata.high || 0} high, ${metadata.moderate || 0} moderate.`);
if (acceptedNoFix.length) {
  console.warn("Reviewed Metro/image-size advisories accepted temporarily:");
  for (const item of acceptedNoFix) console.warn(`- ${item.title}${item.url ? ` (${item.url})` : ""}`);
}
if (blocking.length) {
  console.error("Blocking production security advisories:");
  for (const item of blocking) console.error(`- ${item.packageName}: ${item.title}${item.url ? ` (${item.url})` : ""}`);
  process.exit(1);
}

console.log("No unreviewed high/critical production advisories remain.");
