/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function removeIfExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
  console.log(`Removed ${label}`);
}

function main() {
  const root = process.cwd();
  const nextDevDir = path.join(root, ".next", "dev");
  const nextLock = path.join(nextDevDir, "lock");
  const devSafeScript = path.join(root, "scripts", "dev-safe.js");

  removeIfExists(nextLock, ".next/dev/lock");
  removeIfExists(nextDevDir, ".next/dev cache");

  const child = spawn(process.execPath, [devSafeScript], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main();
