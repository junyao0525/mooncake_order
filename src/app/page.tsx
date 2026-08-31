"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createOrder } from "./actions";
import type { OrderInput } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Product catalog — from the Angel Bakery 2026 Moon Cake Menu         */
/* ------------------------------------------------------------------ */

type Product = {
  id: string;
  no: string;
  name: string;
  cn: string;
  desc: string;
  price: number | null; // null = price on request
  unit: string;
  flavours: string[];
  // Photos served from /public/assets.
  photos: string[];
  // true = a box ships as a mix of all `flavours`; the customer may override
  // it to a single flavour. false = the box is always one flavour.
  mixed: boolean;
  eggYolkOption: boolean;
};

const PRODUCTS: Product[] = [
  {
    id: "shanghai",
    no: "01",
    name: "Shanghai Moon Cake",
    cn: "上海月饼",
    desc: "80g · 一盒6粒 / Box of 6 · 默认 mix 三个口味",
    price: 68,
    unit: "box",
    flavours: ["纯莲蓉 Pure Lotus", "翡翠 Jade", "白莲蓉 White Lotus"],
    photos: ["/assets/shanghai_1.png", "/assets/shanghai_2.png"],
    mixed: true,
    eggYolkOption: true,
  },
  {
    id: "salted-yolk",
    no: "02",
    name: "Salted Egg Yolk Pastry",
    cn: "蛋黄酥",
    desc: "80g · 一盒6粒 / Box of 6 · 默认 mix 三个口味",
    price: 68,
    unit: "box",
    flavours: ["纯莲蓉 Pure Lotus", "翡翠 Jade", "白莲蓉 White Lotus"],
    photos: ["/assets/salted_1.png", "/assets/salted_2.png"],
    mixed: true,
    eggYolkOption: true,
  },
  {
    id: "3qmuaji",
    no: "03",
    name: "3QMuaji Moon Cake",
    cn: "拉丝鸡丝咸蛋黄月饼",
    desc: "100g+ · 一盒四粒 / Box of 4 · 默认 mix 三个口味",
    price: 60,
    unit: "box",
    flavours: ["豆沙 Red Bean", "翡翠 Jade", "白莲蓉 White Lotus"],
    photos: ["/assets/3q_1.png", "/assets/3q_2.png"],
    mixed: true,
    eggYolkOption: false,
  },
  {
    id: "vegetarian",
    no: "04",
    name: "Vegetarian Pastry",
    cn: "素螺旋酥",
    desc: "80g · 一盒6粒 / Box of 6 · 只有一个口味 (无蛋黄 / No egg yolk)",
    price: 68,
    unit: "box",
    flavours: ["纯莲蓉 Pure Lotus"],
    photos: ["/assets/vege.png"],
    mixed: false,
    eggYolkOption: false,
  },
  {
    id: "kuih-big",
    no: "05",
    name: "Kuih Lapis (Big)",
    cn: "印尼千层糕 · 大",
    desc: "1kg+ · 需提早预定 / Pre-order",
    price: 148,
    unit: "pc",
    flavours: [],
    photos: [
      "/assets/kuih_lapis_1.png",
      "/assets/kuih_lapis_2.png",
      "/assets/kuih_lapis_3.png",
    ],
    mixed: false,
    eggYolkOption: false,
  },
  {
    id: "kuih-small",
    no: "05",
    name: "Kuih Lapis (Small)",
    cn: "印尼千层糕 · 小",
    desc: "需提早预定 / Pre-order",
    price: 88,
    unit: "pc",
    flavours: [],
    photos: [
      "/assets/kuih_lapis_1.png",
      "/assets/kuih_lapis_2.png",
      "/assets/kuih_lapis_3.png",
    ],
    mixed: false,
    eggYolkOption: false,
  },
];

const WHATSAPP_NUMBER = "60105202002"; // 010-5202002

type LineState = {
  qty: number;
  flavour: string;
  eggYolk: "with" | "without";
  remarks: string;
};

const emptyLine: LineState = {
  qty: 0,
  flavour: "",
  eggYolk: "with",
  remarks: "",
};

// What this line's flavour actually is. A blank `line.flavour` on a mixed
// product means the default mixed box — not a missing answer.
function flavourLabel(product: Product, line: LineState): string {
  if (line.flavour) return line.flavour;
  if (product.mixed) return `Mix ${product.flavours.length} 口味`;
  return product.flavours[0] ?? "";
}

/* ------------------------------------------------------------------ */

export default function OrderFormPage() {
  const [customer, setCustomer] = useState({
    name: "",
    contact: "",
    orderDate: "",
    neededBy: "",
  });

  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(PRODUCTS.map((p) => [p.id, { ...emptyLine }])),
  );

  const [payment, setPayment] = useState("");
  const [paymentOther, setPaymentOther] = useState("");
  const [fulfilment, setFulfilment] = useState<"self" | "delivery" | "">("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [details, setDetails] = useState({
    name: "",
    address: "",
    date: "",
    time: "",
  });
  const [remarks, setRemarks] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateLine = (id: string, patch: Partial<LineState>) =>
    setLines((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const setQty = (id: string, qty: number) =>
    updateLine(id, { qty: Math.max(0, qty) });

  const orderedItems = useMemo(
    () =>
      PRODUCTS.map((p) => ({ product: p, line: lines[p.id] })).filter(
        (x) => x.line.qty > 0,
      ),
    [lines],
  );

  const subtotal = useMemo(
    () =>
      orderedItems.reduce(
        (sum, { product, line }) => sum + (product.price ?? 0) * line.qty,
        0,
      ),
    [orderedItems],
  );

  const fee = fulfilment === "delivery" ? Number(deliveryFee) || 0 : 0;
  const total = subtotal + fee;

  const currency = (n: number) =>
    `RM${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const buildSummary = () => {
    const lines: string[] = [];
    lines.push("*🥮 Angel Bakery — 2026 Moon Cake Order*");
    lines.push("");
    if (customer.name) lines.push(`*Name:* ${customer.name}`);
    if (customer.contact) lines.push(`*Contact:* ${customer.contact}`);
    if (customer.orderDate) lines.push(`*Order Date:* ${customer.orderDate}`);
    if (customer.neededBy) lines.push(`*Needed By:* ${customer.neededBy}`);
    lines.push("");
    lines.push("*Order:*");
    orderedItems.forEach(({ product, line }, i) => {
      const parts = [`${product.name} ${product.cn}`];
      const flav = flavourLabel(product, line);
      if (flav) parts.push(`(${flav})`);
      if (product.eggYolkOption) {
        parts.push(line.eggYolk === "with" ? "+蛋黄" : "无蛋黄");
      }
      const amt =
        product.price != null
          ? ` = ${currency(product.price * line.qty)}`
          : " = (TBC)";
      lines.push(`${i + 1}. ${parts.join(" ")} × ${line.qty}${amt}`);
      if (line.remarks) lines.push(`   ↳ ${line.remarks}`);
    });
    lines.push("");
    lines.push(`*Subtotal:* ${currency(subtotal)}`);
    if (fee) lines.push(`*Delivery:* ${currency(fee)}`);
    lines.push(`*TOTAL:* ${currency(total)}`);
    lines.push("");
    if (payment)
      lines.push(
        `*Payment:* ${payment === "Others" ? `Others - ${paymentOther}` : payment}`,
      );
    if (fulfilment)
      lines.push(`*${fulfilment === "self" ? "Self Collection" : "Delivery"}*`);
    if (fulfilment === "delivery" || details.address) {
      if (details.name) lines.push(`Recipient: ${details.name}`);
      if (details.address) lines.push(`Address: ${details.address}`);
      if (details.date) lines.push(`Date: ${details.date}`);
      if (details.time) lines.push(`Time: ${details.time}`);
    }
    if (remarks) lines.push(`*Remarks:* ${remarks}`);
    return lines.join("\n");
  };

  const buildOrderInput = (): OrderInput => ({
    name: customer.name,
    contact: customer.contact,
    orderDate: customer.orderDate,
    neededBy: customer.neededBy,
    items: orderedItems.map(({ product, line }) => ({
      productId: product.id,
      name: product.name,
      cn: product.cn,
      flavour: flavourLabel(product, line),
      eggYolk: product.eggYolkOption ? line.eggYolk : "",
      qty: line.qty,
      price: product.price,
      remarks: line.remarks,
    })),
    subtotal,
    deliveryFee: fee,
    total,
    payment: payment === "Others" ? `Others - ${paymentOther}` : payment,
    fulfilment,
    recipient: details.name,
    address: details.address,
    handoverDate: details.date,
    handoverTime: details.time,
    remarks,
  });

  const handleSubmit = async () => {
    setSubmitted(true);
    setSaveError(null);
    if (orderedItems.length === 0) return;

    setSaving(true);
    const result = await createOrder(buildOrderInput());
    setSaving(false);

    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSavedId(result.id);
    // Also open a pre-filled WhatsApp message to the bakery.
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildSummary())}`;
    window.open(url, "_blank");
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="overflow-hidden rounded-3xl border-2 border-line bg-cream-soft shadow-[0_20px_60px_-25px_rgba(90,51,22,0.5)]"
      >
        <Header />

        <div className="space-y-8 p-5 sm:p-8">
          {/* Customer info */}
          <section className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field
              label="👤 Customer Name"
              value={customer.name}
              onChange={(v) => setCustomer((c) => ({ ...c, name: v }))}
              placeholder="Your name"
            />
            <Field
              label="📅 Order Date"
              type="date"
              value={customer.orderDate}
              onChange={(v) => setCustomer((c) => ({ ...c, orderDate: v }))}
            />
            <Field
              label="📞 Contact No."
              type="tel"
              value={customer.contact}
              onChange={(v) => setCustomer((c) => ({ ...c, contact: v }))}
              placeholder="01x-xxxxxxx"
            />
            <Field
              label="🕐 Needed By Date"
              type="date"
              value={customer.neededBy}
              onChange={(v) => setCustomer((c) => ({ ...c, neededBy: v }))}
            />
          </section>

          {/* Product selection */}
          <section>
            <SectionTitle>Select Your Mooncakes</SectionTitle>
            <div className="mt-4 space-y-4">
              {PRODUCTS.map((p, i) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  line={lines[p.id]}
                  currency={currency}
                  onQty={(q) => setQty(p.id, q)}
                  onChange={(patch) => updateLine(p.id, patch)}
                  photoDelay={i * 500}
                />
              ))}
            </div>
          </section>

          {/* Order summary */}
          <section className="rounded-2xl border border-line bg-cream/60 p-5">
            <SectionTitle>Order Summary</SectionTitle>
            {orderedItems.length === 0 ? (
              <p className="mt-3 text-sm text-brown/60">
                No items selected yet — add quantities above.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line/60">
                {orderedItems.map(({ product, line }) => (
                  <li
                    key={product.id}
                    className="flex items-start justify-between gap-3 py-2 text-sm"
                  >
                    <span className="text-brown-deep">
                      <span className="font-semibold">
                        {product.name} {product.cn}
                      </span>
                      {flavourLabel(product, line) && (
                        <span className="text-brown/70">
                          {" "}
                          · {flavourLabel(product, line)}
                        </span>
                      )}
                      {product.eggYolkOption &&
                        (line.eggYolk === "with" ? (
                          <span className="text-red"> · +蛋黄</span>
                        ) : (
                          <span className="text-brown/70"> · 无蛋黄</span>
                        ))}
                      <span className="text-brown/70"> × {line.qty}</span>
                    </span>
                    <span className="whitespace-nowrap font-semibold text-brown-deep">
                      {product.price != null
                        ? currency(product.price * line.qty)
                        : "TBC"}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
              <Row label="Subtotal" value={currency(subtotal)} />
              {fulfilment === "delivery" && (
                <Row label="Delivery Fee" value={currency(fee)} />
              )}
              <div className="mt-2 flex items-center justify-between rounded-xl bg-brown px-4 py-3 text-cream-soft">
                <span className="font-display text-lg font-bold tracking-wide">
                  TOTAL AMOUNT
                </span>
                <span className="font-display text-xl font-extrabold">
                  {currency(total)}
                </span>
              </div>
            </div>
          </section>

          {/* Payment + delivery */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Panel title="💳 Payment Method">
              <div className="space-y-2">
                {["Bank Transfer", "TNG eWallet", "Cash"].map((m) => (
                  <Radio
                    key={m}
                    name="payment"
                    label={m}
                    checked={payment === m}
                    onChange={() => setPayment(m)}
                  />
                ))}
                <div className="flex items-center gap-2">
                  <Radio
                    name="payment"
                    label="Others"
                    checked={payment === "Others"}
                    onChange={() => setPayment("Others")}
                  />
                  <input
                    type="text"
                    value={paymentOther}
                    onChange={(e) => setPaymentOther(e.target.value)}
                    onFocus={() => setPayment("Others")}
                    className="min-w-0 flex-1 border-b border-line bg-transparent px-1 py-0.5 text-sm outline-none focus:border-accent"
                    placeholder="specify"
                  />
                </div>
              </div>
            </Panel>

            <Panel title="🚚 Delivery / Collection">
              <div className="space-y-2">
                <Radio
                  name="fulfilment"
                  label="Self Collection"
                  checked={fulfilment === "self"}
                  onChange={() => setFulfilment("self")}
                />
                <div className="flex items-center gap-2">
                  <Radio
                    name="fulfilment"
                    label="Delivery (Add RM"
                    checked={fulfilment === "delivery"}
                    onChange={() => setFulfilment("delivery")}
                  />
                  <input
                    type="number"
                    min={0}
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    onFocus={() => setFulfilment("delivery")}
                    className="w-16 border-b border-line bg-transparent px-1 py-0.5 text-sm outline-none focus:border-accent"
                    placeholder="0"
                  />
                  <span className="text-sm text-brown">)</span>
                </div>
              </div>
            </Panel>
          </section>

          {/* Delivery / collection details */}
          <Panel title="📍 Delivery / Collection Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Name"
                value={details.name}
                onChange={(v) => setDetails((d) => ({ ...d, name: v }))}
                placeholder="Recipient name"
              />
              <Field
                label="Address"
                value={details.address}
                onChange={(v) => setDetails((d) => ({ ...d, address: v }))}
                placeholder="Delivery / collection address"
              />
              <Field
                label="Date"
                type="date"
                value={details.date}
                onChange={(v) => setDetails((d) => ({ ...d, date: v }))}
              />
              <Field
                label="Time"
                type="time"
                value={details.time}
                onChange={(v) => setDetails((d) => ({ ...d, time: v }))}
              />
            </div>
          </Panel>

          {/* Remarks */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brown">
              📝 Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="Any special requests..."
            />
          </div>

          {/* Submit */}
          <div className="flex flex-col items-center gap-3">
            {submitted && orderedItems.length === 0 && (
              <p className="text-sm font-medium text-red">
                Please add at least one item before submitting.
              </p>
            )}
            {saveError && (
              <p className="text-sm font-medium text-red">{saveError}</p>
            )}
            {savedId ? (
              <div className="w-full rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-center">
                <p className="font-display text-lg font-bold text-emerald-700">
                  ✅ Order received — thank you!
                </p>
                <p className="mt-1 text-sm text-emerald-700/80">
                  Reference:{" "}
                  <span className="font-mono font-semibold">
                    {savedId.slice(-8).toUpperCase()}
                  </span>
                  . We&apos;ll confirm with you shortly.
                </p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-red px-6 py-3.5 text-base font-bold text-cream-soft shadow-lg shadow-red/30 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60 sm:w-auto sm:px-12"
              >
                {saving ? "Submitting…" : "🥮 Submit Order"}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="text-sm font-medium text-brown underline-offset-4 hover:underline"
            >
              or print / save as PDF
            </button>
          </div>
        </div>

        <Footer />
      </form>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function Header() {
  return (
    <header className="relative bg-gradient-to-b from-[#f3d9a3] to-cream-soft px-5 py-8 text-center sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute left-4 top-4 text-3xl opacity-70 sm:text-4xl">
        🏮
      </div>
      <div className="pointer-events-none absolute right-4 top-4 text-3xl opacity-80 sm:text-4xl">
        🌕
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-accent sm:text-xs">
        Every Sweet Come From Angel · Handmade
      </p>
      <h1 className="mt-1 font-display text-2xl font-extrabold text-red drop-shadow-sm sm:text-4xl">
        Angel Bakery
        <span className="ml-2 align-middle text-xl text-brown-deep sm:text-3xl">
          天使牌
        </span>
      </h1>
      <div className="mt-3 font-display text-xl font-bold tracking-wide text-brown-deep sm:text-3xl">
        2026 MOON CAKE
      </div>
      <div className="font-display text-sm tracking-[0.3em] text-accent sm:text-lg">
        — ORDER FORM —
      </div>
      <p className="mx-auto mt-3 max-w-md text-[11px] leading-relaxed text-brown/80 sm:text-xs">
        100% 全手工制作 · 无添加任何防腐剂 · 真材实料 · 低糖健康
      </p>
    </header>
  );
}

function ProductRow({
  product,
  line,
  currency,
  onQty,
  onChange,
  photoDelay,
}: {
  product: Product;
  line: LineState;
  currency: (n: number) => string;
  onQty: (q: number) => void;
  onChange: (patch: Partial<LineState>) => void;
  photoDelay: number;
}) {
  const active = line.qty > 0;
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        active ? "border-accent bg-cream shadow-sm" : "border-line bg-cream/40"
      }`}
    >
      <div className="flex items-start gap-3">
        {product.photos.length > 0 && (
          <ProductPhotos
            photos={product.photos}
            alt={`${product.name} ${product.cn}`}
            delay={photoDelay}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brown text-[11px] font-bold text-cream-soft">
                  {product.no}
                </span>
                <h3 className="font-semibold text-brown-deep">
                  {product.name}{" "}
                  <span className="text-brown/80">{product.cn}</span>
                </h3>
              </div>
              <p className="mt-1 pl-8 text-xs text-brown/70">{product.desc}</p>
            </div>
            <div className="text-right">
              <div className="font-display text-lg font-bold text-red">
                {product.price != null ? currency(product.price) : "TBC"}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-brown/60">
                per {product.unit}
              </div>
            </div>
          </div>

          {/* controls */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {product.mixed ? (
              <select
                value={line.flavour}
                onChange={(e) => onChange({ flavour: e.target.value })}
                className="rounded-lg border border-line bg-cream-soft px-2.5 py-1.5 text-sm text-brown-deep outline-none focus:border-accent"
              >
                <option value="">
                  Mix {product.flavours.length} 口味（默认）
                </option>
                {product.flavours.map((f) => (
                  <option key={f} value={f}>
                    只要 {f}
                  </option>
                ))}
              </select>
            ) : (
              product.flavours.length === 1 && (
                <span className="rounded-lg border border-line bg-cream-soft px-2.5 py-1.5 text-sm text-brown-deep">
                  {product.flavours[0]}
                </span>
              )
            )}

            {product.eggYolkOption && (
              <select
                value={line.eggYolk}
                onChange={(e) =>
                  onChange({ eggYolk: e.target.value as LineState["eggYolk"] })
                }
                className="rounded-lg border border-line bg-cream-soft px-2.5 py-1.5 text-sm text-brown-deep outline-none focus:border-accent"
              >
                <option value="with">要蛋黄 / With</option>
                <option value="without">不要蛋黄 / Without</option>
              </select>
            )}

            <QtyStepper qty={line.qty} onQty={onQty} />

            {active && product.price != null && (
              <span className="ml-auto text-sm font-semibold text-brown-deep">
                = {currency(product.price * line.qty)}
              </span>
            )}
          </div>

          {active && (
            <div className="mt-2">
              <input
                type="text"
                value={line.remarks}
                onChange={(e) => onChange({ remarks: e.target.value })}
                className="w-full rounded-lg border border-line bg-cream-soft px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                placeholder={
                  product.mixed
                    ? "备注：想要单一口味请注明 / Note a single flavour here"
                    : "Remarks for this item (optional)"
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PHOTO_INTERVAL = 3000;

function ProductPhotos({
  photos,
  alt,
  delay,
}: {
  photos: string[];
  alt: string;
  delay: number;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-advance. `idx` is deliberately not a dependency — the functional
  // setter already reads the latest value, and re-running here would restart
  // the stagger on every tick. Re-runs on `paused` so hovering holds the photo.
  useEffect(() => {
    if (photos.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let interval: ReturnType<typeof setInterval>;
    const advance = () => setIdx((i) => (i + 1) % photos.length);
    // Stagger only the first tick so the rows don't all flip on the same frame.
    const start = setTimeout(() => {
      advance();
      interval = setInterval(advance, PHOTO_INTERVAL);
    }, PHOTO_INTERVAL + delay);

    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [photos.length, paused, delay]);

  return (
    <div
      className="shrink-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-line sm:h-24 sm:w-24">
        {photos.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={i === 0 ? alt : ""}
            width={192}
            height={192}
            priority={i === 0}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              i === idx ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
      {photos.length > 1 && (
        <div className="mt-1.5 flex justify-center gap-1.5">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`${alt} — photo ${i + 1}`}
              aria-current={i === idx}
              className={`h-1.5 w-1.5 rounded-full transition ${
                i === idx ? "bg-accent" : "bg-line hover:bg-brown/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QtyStepper({
  qty,
  onQty,
}: {
  qty: number;
  onQty: (q: number) => void;
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-cream-soft">
      <button
        type="button"
        onClick={() => onQty(qty - 1)}
        className="grid h-8 w-8 place-items-center text-lg text-brown transition hover:bg-line/40 disabled:opacity-30"
        disabled={qty <= 0}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <input
        type="number"
        min={0}
        value={qty}
        onChange={(e) => onQty(Number(e.target.value) || 0)}
        className="w-10 border-x border-line bg-transparent py-1 text-center text-sm font-semibold text-brown-deep outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={() => onQty(qty + 1)}
        className="grid h-8 w-8 place-items-center text-lg text-brown transition hover:bg-line/40"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brown">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-sm text-brown-deep outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <h2 className="font-display text-lg font-bold tracking-wide text-brown-deep">
        {children}
      </h2>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-cream/40 p-4">
      <h3 className="mb-3 text-sm font-bold text-brown-deep">{title}</h3>
      {children}
    </div>
  );
}

function Radio({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-brown-deep">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[#c0392b]"
      />
      {label}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-brown">
      <span>{label}</span>
      <span className="font-semibold text-brown-deep">{value}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-gradient-to-b from-cream-soft to-[#f3d9a3] px-5 py-6 text-center sm:px-8">
      <p className="font-display text-sm font-semibold text-red">
        ♥ Thank You For Your Support! ♥
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-brown-deep">
        <span>📞 0105202002 / 0186630666 / 0167930666</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-brown-deep">
        <span>📷 angel_bakery666</span>
        <span>👍 Angel Bakery 天使牌 - Handmade</span>
      </div>
    </footer>
  );
}
