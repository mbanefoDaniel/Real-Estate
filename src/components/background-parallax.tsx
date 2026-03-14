"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function BackgroundParallax() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const root = document.documentElement;

    const updateParallax = () => {
      const offset = Math.min(window.scrollY * 0.18, 84);
      root.style.setProperty("--bg-parallax-y", `${offset.toFixed(2)}px`);
    };

    updateParallax();
    window.addEventListener("scroll", updateParallax, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateParallax);
      root.style.setProperty("--bg-parallax-y", "0px");
    };
  }, []);

  return (
    <div
      className={`site-background-layer ${isHome ? "site-background-home" : "site-background-alt"}`}
      aria-hidden="true"
    >
      <div className="site-background-photo" />
      <div className="site-background-overlay" />
    </div>
  );
}
