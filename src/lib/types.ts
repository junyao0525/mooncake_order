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
