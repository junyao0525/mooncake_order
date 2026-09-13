"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dashboardHref, type OrderQuery } from "./query";

/**
 * Writes what you type into the URL's `q`, which the page reads to build the
 * Prisma filter. Debounced so a search runs once you stop typing rather than
 * per keystroke, and `replace` rather than `push` so Back leaves the dashboard
 * instead of walking through every prefix of the word.
 */
export default function SearchBox({ query }: { query: OrderQuery }) {
  const router = useRouter();
  const [text, setText] = useState(query.q);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  // The term the URL has been asked for, which leads `query.q` until the
  // navigation lands. Submitting or clearing goes through here too, so the
  // debounce below does not then fire the same search a second time.
  const [sent, setSent] = useState(query.q);

  // Adopt `q` when it changes from somewhere else — Back, or the "clear
  // filters" link — so the box never drifts from the results it describes.
  // When it is merely catching up to what was typed, leave the box alone: the
  // navigation can land after a further keystroke, and adopting it then would
  // swallow that keystroke.
  const [serverQ, setServerQ] = useState(query.q);
  if (serverQ !== query.q) {
    setServerQ(query.q);
    if (query.q !== sent) {
      setSent(query.q);
      setText(query.q);
    }
  }

  const go = (value: string) => {
    setSent(value);
    startTransition(() =>
      router.replace(dashboardHref(query, { q: value, page: 1 }), {
        scroll: false,
      }),
    );
  };

  useEffect(() => {
    if (text === sent) return;
    const timer = setTimeout(() => go(text), 300);
    return () => clearTimeout(timer);
    // `go` is rebuilt every render because `query` is a fresh object each
    // time; keying the timer to the text alone is what stops it restarting
    // forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, sent]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(text);
      }}
      className="relative w-full sm:max-w-xs"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brown/50"
      >
        ⌕
      </span>
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search ref, name, contact…"
        aria-label="Search orders"
        className="w-full rounded-full border border-line bg-cream-soft py-2 pl-8 pr-9 text-sm text-brown-deep outline-none placeholder:text-brown/40 focus:border-accent"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText("");
            go("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brown/50 hover:text-red"
        >
          ✕
        </button>
      )}
      <span
        aria-live="polite"
        className={`pointer-events-none absolute -bottom-5 left-4 text-xs text-brown/50 transition-opacity ${
          pending ? "opacity-100" : "opacity-0"
        }`}
      >
        Searching…
      </span>
    </form>
  );
}
