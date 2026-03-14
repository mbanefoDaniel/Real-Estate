import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center md:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-xl text-muted">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
        >
          Go Home
        </Link>
        <Link
          href="/properties"
          className="rounded-full border border-black/15 px-6 py-3 text-sm font-semibold transition hover:bg-black/5"
        >
          Browse Listings
        </Link>
      </div>
    </main>
  );
}
