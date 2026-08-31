import OrderForm from "./OrderForm";
import { AGENTS, DEFAULT_AGENT } from "@/lib/agents";

// The plain link. Agents hand out /a/<slug> instead — see app/a/[agent]/page.tsx.
export default function Page() {
  return <OrderForm agent={AGENTS[DEFAULT_AGENT]} />;
}
