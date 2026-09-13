export type OrderItemInput = {
  productId: string;
  name: string;
  cn: string;
  flavour: string;
  eggYolk: "" | "with" | "without";
  qty: number;
  price: number | null;
  remarks: string;
};

export type OrderInput = {
  /** Slug of the agent whose link the order came through. */
  agent: string;
  name: string;
  contact: string;
  orderDate: string;
  neededBy: string;
  items: OrderItemInput[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  payment: string;
  fulfilment: "" | "self" | "delivery";
  recipient: string;
  address: string;
  handoverDate: string;
  handoverTime: string;
  remarks: string;
};

export const ORDER_STATUSES = [
  "NEW",
  "PREPARING",
  "READY",
  "DONE",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * The short code the customer and the bakery quote at each other — shown on
 * the order form's confirmation, sent in the WhatsApp message, and stored on
 * the row so the dashboard can be searched by it. Derived from the id rather
 * than generated, so it stays the same for orders taken before the column
 * existed. The full cuid is unreadable over the phone; its tail is unique
 * enough to identify one order.
 */
export const refCode = (id: string) => id.slice(-8).toUpperCase();
