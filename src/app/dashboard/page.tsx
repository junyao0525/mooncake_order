import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAgent } from "@/lib/agents";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";
import StatusSelect from "./StatusSelect";
import SearchBox from "./SearchBox";
import {
  PAGE_SIZE,
  TABS,
  TAB_LABELS,
  FIRST_DIR,
  dashboardHref,
  isFiltered,
  pageWindow,
  parseQuery,
  tallyByStatus,
  type OrderQuery,
  type SortDir,
  type SortKey,
} from "./query";
import { refCode, type OrderItemInput, type OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  `RM${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Which column each sort key maps onto. Nullable columns sort their blanks to
 * the bottom either way — an order with no delivery date is not "earliest".
 */
const ORDER_BY: Record<
  SortKey,
  (dir: SortDir) => Prisma.OrderOrderByWithRelationInput
> = {
  date: (dir) => ({ createdAt: dir }),
  agent: (dir) => ({ agent: { sort: dir, nulls: "last" } }),
  customer: (dir) => ({ name: dir }),
  neededBy: (dir) => ({ neededBy: { sort: dir, nulls: "last" } }),
  total: (dir) => ({ total: dir }),
  // The enum is declared NEW → CANCELLED, so ascending is workflow order.
  status: (dir) => ({ status: dir }),
};

/**
 * Free-text search across the fields an order is actually looked up by. The
 * `id` clause covers rows taken before the `ref` column existed: their code is
 * derived from the tail of the id, so the same code still finds them.
 */
function searchFilter(term: string): Prisma.OrderWhereInput {
  if (!term) return {};
  const contains = { contains: term, mode: "insensitive" } as const;
  return {
    OR: [
      { ref: contains },
      { id: { endsWith: term, mode: "insensitive" } },
      { name: contains },
      { contact: contains },
      { recipient: contains },
      { address: contains },
      { agent: contains },
      { remarks: contains },
    ],
  };
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const session = await requireAdmin();
  const query = parseQuery(await props.searchParams);
  const term = query.q.trim();

  const where: Prisma.OrderWhereInput = {
    ...searchFilter(term),
    ...(query.tab === "ALL" ? {} : { status: query.tab }),
  };

  // One tally over every order feeds the stat cards; a second, narrowed by the
  // search but not by the tab, feeds the tab badges — so a badge says how many
  // matches that tab holds rather than repeating the tab you are already on.
  const [matchCount, allStats, searchStats] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    }),
    term
      ? prisma.order.groupBy({
          by: ["status"],
          where: searchFilter(term),
          _count: { _all: true },
        })
      : null,
  ]);

  const tabCounts = tallyByStatus(searchStats ?? allStats);

  const totalOrders = allStats.reduce((n, s) => n + s._count._all, 0);
  const openOrders = allStats
    .filter((s) => s.status !== "DONE" && s.status !== "CANCELLED")
    .reduce((n, s) => n + s._count._all, 0);
  const revenue = allStats
    .filter((s) => s.status !== "CANCELLED")
    .reduce((n, s) => n + (s._sum.total ?? 0), 0);
  const latest = allStats.reduce<Date | null>((newest, s) => {
    const d = s._max.createdAt;
    return d && (!newest || d > newest) ? d : newest;
  }, null);

  // Clamp before fetching rows, so narrowing the filter down to fewer pages
  // lands on the last real page instead of a blank one.
  const pageCount = Math.max(1, Math.ceil(matchCount / PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const view: OrderQuery = { ...query, page };

  const orders = await prisma.order.findMany({
    where,
    // The second key only breaks ties, so rows never shuffle between pages
    // when the sorted column repeats a value.
    orderBy: [ORDER_BY[query.sort](query.dir), { createdAt: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const firstRow = matchCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = (page - 1) * PAGE_SIZE + orders.length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-red sm:text-3xl">
            Orders Dashboard
          </h1>
          <p className="text-sm text-brown/70">Signed in as {session.sub}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-brown hover:bg-cream"
          >
            + New Order Form
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full bg-brown px-4 py-2 text-sm font-medium text-cream-soft hover:brightness-110"
            >
              Log out
            </button>
          </form>
        </div>
      </div>

      {/* Stats — always the whole book, never just the page on screen. */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Orders" value={String(totalOrders)} />
        <Stat label="Open Orders" value={String(openOrders)} />
        <Stat label="Revenue (excl. cancelled)" value={currency(revenue)} />
        <Stat
          label="Latest"
          value={latest ? latest.toLocaleDateString("en-MY") : "—"}
        />
      </div>

      {/* Tabs + search */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = tab === query.tab;
            return (
              <Link
                key={tab}
                href={dashboardHref(view, { tab, page: 1 })}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-brown bg-brown text-cream-soft"
                    : "border-line text-brown hover:bg-cream"
                }`}
              >
                {TAB_LABELS[tab]}
                <span
                  className={`ml-1.5 text-xs ${
                    active ? "text-cream-soft/70" : "text-brown/50"
                  }`}
                >
                  {tabCounts[tab]}
                </span>
              </Link>
            );
          })}
        </nav>
        <SearchBox query={view} />
      </div>

      {/* Orders */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-cream-soft">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-brown/60">
            {isFiltered(query) ? (
              <>
                <p>No orders match this view.</p>
                <Link
                  href="/dashboard"
                  className="mt-2 inline-block font-medium text-accent underline underline-offset-4"
                >
                  Clear search and filters
                </Link>
              </>
            ) : (
              <p>
                No orders yet. Orders submitted from the form will appear here.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-brown text-left text-cream-soft">
                  <Th>Ref</Th>
                  <SortTh view={view} sortKey="date">
                    Date
                  </SortTh>
                  <SortTh view={view} sortKey="agent">
                    Agent
                  </SortTh>
                  <SortTh view={view} sortKey="customer">
                    Customer
                  </SortTh>
                  <Th>Items</Th>
                  <SortTh view={view} sortKey="neededBy">
                    Needed By
                  </SortTh>
                  <Th>Fulfilment</Th>
                  <SortTh view={view} sortKey="total" align="right">
                    Total
                  </SortTh>
                  <SortTh view={view} sortKey="status">
                    Status
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const items = (o.items as unknown as OrderItemInput[]) ?? [];
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-line/60 align-top last:border-0 hover:bg-cream/50"
                    >
                      {/* Falls back to the derived code so a row whose ref
                          failed to store still shows the same value the
                          customer was given. */}
                      <Td className="whitespace-nowrap font-mono text-xs font-semibold text-brown-deep">
                        {o.ref ?? refCode(o.id)}
                      </Td>
                      <Td className="whitespace-nowrap text-brown/70">
                        {o.createdAt.toLocaleDateString("en-MY")}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-brown">
                          {getAgent(o.agent)?.name ?? o.agent ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <div className="font-semibold text-brown-deep">
                          {o.name}
                        </div>
                        <div className="text-xs text-brown/60">{o.contact}</div>
                      </Td>
                      <Td>
                        <ul className="space-y-0.5">
                          {items.map((it, i) => (
                            <li key={i} className="text-brown-deep">
                              {it.name} {it.cn}
                              {it.flavour ? ` · ${it.flavour}` : ""}
                              {it.eggYolk === "with" ? " · +蛋黄" : ""}
                              {it.eggYolk === "without" ? " · 无蛋黄" : ""}
                              <span className="text-brown/60"> × {it.qty}</span>
                            </li>
                          ))}
                        </ul>
                        {o.remarks && (
                          <div className="mt-1 text-xs italic text-brown/60">
                            “{o.remarks}”
                          </div>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-brown/70">
                        {o.neededBy || "—"}
                      </Td>
                      <Td className="text-brown/70">
                        {o.fulfilment === "delivery" ? (
                          <span>
                            Delivery
                            <div className="text-xs">{o.address}</div>
                          </span>
                        ) : o.fulfilment === "self" ? (
                          "Self collect"
                        ) : (
                          "—"
                        )}
                        {o.payment && (
                          <div className="text-xs text-brown/50">
                            {o.payment}
                          </div>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-right font-semibold text-brown-deep">
                        {currency(o.total)}
                      </Td>
                      <Td>
                        <StatusSelect
                          id={o.id}
                          status={o.status as OrderStatus}
                        />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paging */}
      {matchCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-brown/60">
            Showing {firstRow}–{lastRow} of {matchCount}
            {isFiltered(query) ? " matching orders" : " orders"}
          </p>
          {pageCount > 1 && <Pager view={view} pageCount={pageCount} />}
        </div>
      )}
    </main>
  );
}

function Pager({ view, pageCount }: { view: OrderQuery; pageCount: number }) {
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <PageLink
        view={view}
        page={view.page - 1}
        disabled={view.page <= 1}
        label="Previous page"
      >
        ‹
      </PageLink>
      {pageWindow(view.page, pageCount).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-1 text-xs text-brown/40">
            …
          </span>
        ) : (
          <PageLink
            key={p}
            view={view}
            page={p}
            current={p === view.page}
            label={`Page ${p}`}
          >
            {p}
          </PageLink>
        ),
      )}
      <PageLink
        view={view}
        page={view.page + 1}
        disabled={view.page >= pageCount}
        label="Next page"
      >
        ›
      </PageLink>
    </nav>
  );
}

function PageLink({
  view,
  page,
  label,
  children,
  current = false,
  disabled = false,
}: {
  view: OrderQuery;
  page: number;
  label: string;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
}) {
  const base =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-sm transition";

  if (disabled) {
    return (
      <span aria-hidden className={`${base} border-line/60 text-brown/30`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={dashboardHref(view, { page })}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`${base} ${
        current
          ? "border-brown bg-brown font-semibold text-cream-soft"
          : "border-line text-brown hover:bg-cream"
      }`}
    >
      {children}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-cream-soft p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-brown/60">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold text-brown-deep">
        {value}
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
  ...rest
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...rest}
      className={`px-4 py-3 text-xs font-bold uppercase tracking-wide ${className}`}
    >
      {children}
    </th>
  );
}

/**
 * A column heading that is also its sort control. Clicking the active column
 * flips the direction; clicking any other starts it in whichever direction
 * reads naturally for that kind of value — newest dates and biggest totals
 * first, names and codes A–Z.
 */
function SortTh({
  view,
  sortKey,
  children,
  align = "left",
}: {
  view: OrderQuery;
  sortKey: SortKey;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const active = view.sort === sortKey;
  const dir: SortDir = active
    ? view.dir === "asc"
      ? "desc"
      : "asc"
    : FIRST_DIR[sortKey];

  return (
    <Th
      className={align === "right" ? "text-right" : ""}
      aria-sort={
        active ? (view.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <Link
        href={dashboardHref(view, { sort: sortKey, dir, page: 1 })}
        title={`Sort by ${sortKey} (${dir})`}
        className={`inline-flex items-center gap-1 hover:text-gold ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-gold" : ""}`}
      >
        {children}
        <span aria-hidden className={active ? "" : "opacity-40"}>
          {active ? (view.dir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </Link>
    </Th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
