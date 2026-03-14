/* eslint-disable @typescript-eslint/no-require-imports */
const net = require("net");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function testPortOnHost(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen({ port, host, exclusive: true });
  });
}

async function isPortFree(port) {
  const [ipv4Free, ipv6Free] = await Promise.all([
    testPortOnHost(port, "0.0.0.0"),
    testPortOnHost(port, "::"),
  ]);

  return ipv4Free && ipv6Free;
}

async function findAvailablePort(startPort) {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = startPort + i;
    const free = await isPortFree(candidate);
    if (free) {
      return candidate;
    }
  }

  throw new Error(`No free port found from ${startPort} to ${startPort + maxAttempts - 1}.`);
}

function parseArgs(argv) {
  let requestedPort = null;
  const passthroughArgs = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if ((arg === "--port" || arg === "-p") && next) {
      const parsed = Number(next);
      if (Number.isInteger(parsed) && parsed > 0) {
        requestedPort = parsed;
      }
      i += 1;
      continue;
    }

    passthroughArgs.push(arg);
  }

  return { requestedPort, passthroughArgs };
}

function withStableBundlerArgs(args) {
  const hasBundlerArg = args.some((arg) => arg === "--webpack" || arg === "--turbopack");
  if (hasBundlerArg) {
    return args;
  }

  const useTurbopack = String(process.env.NPH_USE_TURBOPACK || "false").toLowerCase() === "true";
  return useTurbopack ? ["--turbopack", ...args] : ["--webpack", ...args];
}

function removeDevCache(devDir) {
  if (!fs.existsSync(devDir)) {
    return false;
  }

  try {
    fs.rmSync(devDir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { requestedPort, passthroughArgs } = parseArgs(process.argv.slice(2));
  const startPort = requestedPort || 3000;
  const selectedPort = await findAvailablePort(startPort);
  const lockFile = path.join(process.cwd(), ".next", "dev", "lock");
  const devCacheDir = path.join(process.cwd(), ".next", "dev");
  const stableArgs = withStableBundlerArgs(passthroughArgs);

  if (requestedPort && requestedPort !== selectedPort) {
    console.warn(`Port ${requestedPort} is busy. Starting on ${selectedPort} instead.`);
  }

  // Do not clear cache by default; clearing while another dev server is active
  // can remove live chunk files and make pages appear unrendered.
  if (String(process.env.NPH_CLEAR_DEV_CACHE || "false").toLowerCase() === "true") {
    if (removeDevCache(devCacheDir)) {
      console.warn("Cleared .next/dev cache before startup (NPH_CLEAR_DEV_CACHE=true).");
    }
  }

  if (fs.existsSync(lockFile)) {
    try {
      fs.unlinkSync(lockFile);
      console.warn("Removed stale .next/dev/lock before startup.");
    } catch {
      // If lock removal fails, Next.js will report the concrete reason.
    }
  }

  console.log(`Starting Next.js dev server on port ${selectedPort}...`);

  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

  const startNext = (allowRetryOnLock) => {
    let stderrBuffer = "";
    const child = spawn(process.execPath, [nextBin, "dev", "--port", String(selectedPort), ...stableArgs], {
      stdio: ["inherit", "inherit", "pipe"],
      env: process.env,
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderrBuffer += text;
      process.stderr.write(text);
    });

    child.on("exit", (code) => {
      const lockError = stderrBuffer.includes("Unable to acquire lock") && code === 1;
      const staleRuntimeError =
        stderrBuffer.includes("Cannot find module '../chunks/ssr/[turbopack]_runtime.js'") ||
        stderrBuffer.includes("turbo-persistence") ||
        stderrBuffer.includes("Unable to write meta file");

      if (allowRetryOnLock && lockError) {
        try {
          fs.unlinkSync(lockFile);
          console.warn("Lock error detected. Removed lock file and retrying once...");
        } catch {
          // Retry once even if removal is not possible; useful for transient races.
        }

        startNext(false);
        return;
      }

      if (allowRetryOnLock && staleRuntimeError) {
        removeDevCache(devCacheDir);
        console.warn("Detected stale/corrupt Next.js dev cache. Cleaned .next/dev and retrying once...");
        startNext(false);
        return;
      }

      process.exit(code ?? 0);
    });
  };

  startNext(true);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
