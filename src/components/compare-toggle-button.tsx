"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const COMPARE_KEY = "nph_compare_ids";

function readCompareIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(COMPARE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string").slice(0, 4);
  } catch {
    return [];
  }
}

function saveCompareIds(ids: string[]) {
  window.localStorage.setItem(COMPARE_KEY, JSON.stringify(ids.slice(0, 4)));
}

export default function CompareToggleButton({ propertyId }: { propertyId: string }) {
  const [ids, setIds] = useState<string[]>(() => readCompareIds());
  const [status, setStatus] = useState("");

  const isSelected = useMemo(() => ids.includes(propertyId), [ids, propertyId]);

  function toggle() {
    const existing = readCompareIds();

    if (existing.includes(propertyId)) {
      const next = existing.filter((id) => id !== propertyId);
      saveCompareIds(next);
      setIds(next);
      setStatus("Removed from compare.");
      return;
    }

    if (existing.length >= 4) {
      setStatus("You can compare up to 4 properties.");
      return;
    }

    const next = [...existing, propertyId];
    saveCompareIds(next);
    setIds(next);
    setStatus("Added to compare.");
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
          isSelected
            ? "border-accent bg-accent text-white"
            : "border-black/15 hover:bg-black/5"
        }`}
      >
        {isSelected ? "In Compare" : "Add To Compare"}
      </button>
      <Link
        href="/compare"
        className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold transition hover:bg-black/5"
      >
        Compare ({ids.length})
      </Link>
      {status ? <p className="text-xs text-muted">{status}</p> : null}
    </div>
  );
}
