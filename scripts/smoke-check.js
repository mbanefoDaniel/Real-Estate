const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

async function check(url, label) {
  const response = await fetch(url, { redirect: "manual" });
  const ok = response.status >= 200 && response.status < 400;
  if (!ok) {
    throw new Error(`${label} failed with status ${response.status}`);
  }
  console.log(`[smoke] ${label} ok (${response.status})`);
}

async function run() {
  await check(`${baseUrl}/`, "homepage");
  await check(`${baseUrl}/properties`, "properties page");
  await check(`${baseUrl}/api/auth/me`, "auth session endpoint");
}

run().catch((error) => {
  console.error("[smoke] failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
