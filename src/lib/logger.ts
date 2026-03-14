type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

function writeLog(level: LogLevel, message: string, meta: LogMeta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
    ...(meta.error ? { error: normalizeError(meta.error) } : {}),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logInfo(message: string, meta: LogMeta = {}) {
  writeLog("info", message, meta);
}

export function logWarn(message: string, meta: LogMeta = {}) {
  writeLog("warn", message, meta);
}

export function logError(message: string, meta: LogMeta = {}) {
  writeLog("error", message, meta);
}
