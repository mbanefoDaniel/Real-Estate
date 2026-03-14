"use client";

import { useEffect } from "react";

const RECENTLY_VIEWED_KEY = "nph_recently_viewed";

function readIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export default function RecentlyViewedTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    const existing = readIds().filter((id) => id !== propertyId);
    const next = [propertyId, ...existing].slice(0, 10);
    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  }, [propertyId]);

  return null;
}
