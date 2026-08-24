"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  SESSION_COOKIE,
  signSession,
  sessionCookieOptions,
} from "@/lib/session";
import type { OrderInput, OrderStatus } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";

/* ----------------------------- Auth ----------------------------- */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return { error: "Admin credentials are not configured on the server." };
  }

  const ok =
    safeEqual(email.toLowerCase(), adminEmail.toLowerCase()) &&
    safeEqual(password, adminPassword);

  if (!ok) {
    return { error: "Invalid email or password." };
  }

  const token = await signSession({ sub: adminEmail, role: "admin" });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions);

  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

/* --------------------------- Orders ----------------------------- */

export async function createOrder(
  input: OrderInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  // Basic server-side validation (never trust the client).
  if (!input.name?.trim() || !input.contact?.trim()) {
    return { ok: false, error: "Name and contact are required." };
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "Please add at least one item." };
  }

  try {
    const order = await prisma.order.create({
      data: {
        name: input.name.trim(),
        contact: input.contact.trim(),
        orderDate: input.orderDate || null,
        neededBy: input.neededBy || null,
        items: input.items,
        subtotal: input.subtotal,
        deliveryFee: input.deliveryFee,
        total: input.total,
        payment: input.payment || null,
        fulfilment: input.fulfilment || null,
        recipient: input.recipient || null,
        address: input.address || null,
        handoverDate: input.handoverDate || null,
        handoverTime: input.handoverTime || null,
        remarks: input.remarks || null,
      },
    });
    revalidatePath("/dashboard");
    return { ok: true, id: order.id };
  } catch (e) {
    console.error("createOrder failed:", e);
    return { ok: false, error: "Could not save your order. Please try again." };
  }
}

export async function updateOrderStatus(id: string, status: string) {
  await requireAdmin();
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    throw new Error("Invalid status");
  }
  await prisma.order.update({
    where: { id },
    data: { status: status as OrderStatus },
  });
  revalidatePath("/dashboard");
}
