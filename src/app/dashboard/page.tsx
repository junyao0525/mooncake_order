import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";
import StatusSelect from "./StatusSelect";
import type { OrderItemInput, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  `RM${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function DashboardPage() {
  const session = await requireAdmin();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const openOrders = orders.filter(
    (o) => o.status !== "DONE" && o.status !== "CANCELLED",
  );
  const revenue = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-red sm:text-3xl">
            Orders Dashboard
          </h1>
          <p className="text-sm text-brown/70">
            Signed in as {session.sub}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-brown hover:bg-cream"
          >
            + New Order Form
          </a>
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

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Orders" value={String(orders.length)} />
        <Stat label="Open Orders" value={String(openOrders.length)} />
        <Stat
          label="Revenue (excl. cancelled)"
          value={currency(revenue)}
        />
        <Stat
          label="Latest"
          value={
            orders[0]
              ? orders[0].createdAt.toLocaleDateString("en-MY")
              : "—"
          }
        />
      </div>

      {/* Orders */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-cream-soft">
        {orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-brown/60">
            No orders yet. Orders submitted from the form will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-brown text-left text-cream-soft">
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th>Items</Th>
                  <Th>Needed By</Th>
                  <Th>Fulfilment</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Status</Th>
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
                      <Td className="whitespace-nowrap text-brown/70">
                        {o.createdAt.toLocaleDateString("en-MY")}
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
    </main>
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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wide ${className}`}>
      {children}
    </th>
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
