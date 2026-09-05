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

// image-size <=2.0.2 has two high-severity infinite-loop advisories for
// ICNS/JXL/HEIF parsing, but as of v1.1.2 verification there is no published
// patched release. Metro brings it in as build tooling. Keep this exception
// narrow: package name + no available fix only. Any future fix or any other
// high/critical advisory fails CI until it is reviewed.
const acceptedNoFix = severeAdvisories.filter(
  (item) => item.packageName === "image-size" && item.fixAvailable === false,
);
const blocking = severeAdvisories.filter(
  (item) => !(item.packageName === "image-size" && item.fixAvailable === false),
);

const metadata = report.metadata?.vulnerabilities || {};
console.log(`Production audit: ${metadata.critical || 0} critical, ${metadata.high || 0} high, ${metadata.moderate || 0} moderate.`);
if (acceptedNoFix.length) {
  console.warn("Known no-fix Metro/image-size advisories accepted temporarily:");
  for (const item of acceptedNoFix) console.warn(`- ${item.title}${item.url ? ` (${item.url})` : ""}`);
}
if (blocking.length) {
  console.error("Blocking production security advisories:");
  for (const item of blocking) console.error(`- ${item.packageName}: ${item.title}${item.url ? ` (${item.url})` : ""}`);
  process.exit(1);
}

console.log("No unreviewed high/critical production advisories remain.");
