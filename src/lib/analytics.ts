export async function trackEvent(event: string, metadata?: Record<string, unknown>) {
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event, metadata }),
      keepalive: true,
    });
  } catch {
    // Analytics failures should never block user flows.
  }
}
