"use client";

import { useTransition } from "react";
import { updateOrderStatus } from "../actions";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  NEW: "bg-red/10 text-red border-red/30",
  PREPARING: "bg-gold/20 text-accent border-gold/50",
  READY: "bg-emerald-100 text-emerald-700 border-emerald-300",
  DONE: "bg-brown/10 text-brown border-line",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-300",
};

export default function StatusSelect({
  id,
  status,
}: {
  id: string;
  status: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => updateOrderStatus(id, next));
      }}
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide outline-none transition disabled:opacity-50 ${STYLES[status]}`}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
