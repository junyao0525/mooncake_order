// The dashboard's whole view state — which status tab, the search text, the
// sort column and direction, and the page — lives in the URL. That keeps the
// table a Server Component (Prisma does the filtering, sorting and paging, so
// a search covers every order rather than only the rows already loaded) and
// makes any view shareable and bookmarkable.

import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

/** Rows per page. */
export const PAGE_SIZE = 20;

export const TABS = ["ALL", ...ORDER_STATUSES] as const;
export type Tab = (typeof TABS)[number];

export const TAB_LABELS: Record<Tab, string> = {
  ALL: "All",
  NEW: "New",
  PREPARING: "Preparing",
  READY: "Ready",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

/**
 * Ref is deliberately absent: rows taken before the `ref` column existed still
 * show a code derived from their id, so ordering by the column would not match
 * the codes on screen — and the tail of a cuid has no meaningful order anyway.
 */
export const SORT_KEYS = [
  "date",
  "agent",
  "customer",
  "neededBy",
  "total",
  "status",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type SortDir = "asc" | "desc";

/**
 * Which way a column sorts on its first click. Dates and money read newest /
 * biggest first; names read A–Z.
 */
export const FIRST_DIR: Record<SortKey, SortDir> = {
  date: "desc",
  agent: "asc",
  customer: "asc",
  neededBy: "desc",
  total: "desc",
  status: "asc",
};

export type OrderQuery = {
  tab: Tab;
  q: string;
  sort: SortKey;
  dir: SortDir;
  page: number;
};

export const DEFAULT_QUERY: OrderQuery = {
  tab: "ALL",
  q: "",
  sort: "date",
  dir: "desc",
  page: 1,
};

/** `searchParams` hands back `string | string[] | undefined`; take the first. */
const first = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Anything unrecognised in the URL falls back to the default rather than
 * erroring — these values are hand-editable and arrive from the client.
 */
export function parseQuery(
  sp: Record<string, string | string[] | undefined>,
): OrderQuery {
  const tab = first(sp.tab).toUpperCase() as Tab;
  const sort = first(sp.sort) as SortKey;
  const dir = first(sp.dir) as SortDir;
  const page = Number.parseInt(first(sp.page), 10);

  return {
    tab: TABS.includes(tab) ? tab : DEFAULT_QUERY.tab,
    q: first(sp.q).slice(0, 100),
    sort: SORT_KEYS.includes(sort) ? sort : DEFAULT_QUERY.sort,
    dir: dir === "asc" || dir === "desc" ? dir : DEFAULT_QUERY.dir,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * Link target for a tweak to the current view. Values equal to the default are
 * left out, so the plain `/dashboard` link and the "All" tab share one URL.
 */
export function dashboardHref(
  current: OrderQuery,
  patch: Partial<OrderQuery> = {},
): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.tab !== DEFAULT_QUERY.tab) params.set("tab", next.tab);
  if (next.q.trim()) params.set("q", next.q.trim());
  if (next.sort !== DEFAULT_QUERY.sort) params.set("sort", next.sort);
  if (next.dir !== DEFAULT_QUERY.dir) params.set("dir", next.dir);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

/** True when the view is filtered — used to word the empty state. */
export const isFiltered = (q: OrderQuery) =>
  q.tab !== DEFAULT_QUERY.tab || q.q.trim() !== "";

/**
 * Page numbers to render, with `null` standing for a gap. Always shows the
 * first and last page plus a window around the current one, so the control
 * stays a fixed width however many pages there are.
 */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const around = [page - 1, page, page + 1].filter(
    (p) => p > 1 && p < pageCount,
  );
  const pages = [1, ...around, pageCount];
  const out: (number | null)[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push(null);
    out.push(p);
    prev = p;
  }
  return out;
}

/** Zero-filled tally so every tab has a count even before any order exists. */
export function emptyCounts(): Record<Tab, number> {
  return {
    ALL: 0,
    NEW: 0,
    PREPARING: 0,
    READY: 0,
    DONE: 0,
    CANCELLED: 0,
  };
}

export function tallyByStatus(
  rows: { status: OrderStatus; _count: { _all: number } }[],
): Record<Tab, number> {
  const counts = emptyCounts();
  for (const row of rows) {
    counts[row.status] = row._count._all;
    counts.ALL += row._count._all;
  }
  return counts;
}
