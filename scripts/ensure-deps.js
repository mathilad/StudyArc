const { spawnSync } = require("node:child_process");

function expoInstalled() {
  try {
    require.resolve("expo/package.json", { paths: [process.cwd()] });
    return true;
  } catch {
    return false;
  }
}

if (!expoInstalled()) {
  console.log("\nStudy Arc dependencies are not installed yet.");
  console.log("Running npm install before Expo starts...\n");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, ["install", "--no-audit", "--no-fund"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error("\nnpm install did not complete. Fix the npm/network error above, then run npm start again.");
    process.exit(result.status || 1);
  }
}
