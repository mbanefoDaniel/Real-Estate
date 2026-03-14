import { NextRequest } from "next/server";

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

async function runUpstashPipeline(commands: unknown[][]) {
  const config = getUpstashConfig();
  if (!config) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Array<{ result?: unknown }>;
    return payload;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function enforceDistributedRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const ttlSeconds = Math.max(1, Math.ceil(config.windowMs / 1000));
  const pipeline = await runUpstashPipeline([
    ["INCR", key],
    ["EXPIRE", key, ttlSeconds, "NX"],
    ["PTTL", key],
  ]);

  if (!pipeline || pipeline.length < 3) {
    return null;
  }

  const count = Number(pipeline[0]?.result);
  const ttlMsRaw = Number(pipeline[2]?.result);

  if (!Number.isFinite(count)) {
    return null;
  }

  const retryAfterMs = ttlMsRaw > 0 ? ttlMsRaw : config.windowMs;

  if (count > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, config.limit - count),
    retryAfterMs: 0,
  };
}

function enforceLocalRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, config.limit - existing.count),
    retryAfterMs: 0,
  };
}

export async function enforceRateLimit(
  request: NextRequest,
  keyPrefix: string,
  config: RateLimitConfig
) {
  const ip = getClientIp(request);
  const key = `${keyPrefix}:${ip}`;

  try {
    const distributed = await enforceDistributedRateLimit(key, config);
    if (distributed) {
      return distributed;
    }
  } catch {
    // Fall back to process-local limiter when Redis is unavailable.
  }

  return enforceLocalRateLimit(key, config);
}
