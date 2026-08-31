import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OrderForm from "../../OrderForm";
import { AGENTS, getAgent } from "@/lib/agents";

// One order form per agent: /a/chris, /a/elainey, /a/angel. Orders submitted
// here open WhatsApp to that agent and are tagged with their slug.

// Only these three slugs exist, so prerender them and 404 anything else.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(AGENTS).map((agent) => ({ agent }));
}

export async function generateMetadata(
  props: PageProps<"/a/[agent]">,
): Promise<Metadata> {
  const { agent: slug } = await props.params;
  const agent = getAgent(slug);
  if (!agent) return {};
  return {
    title: `Angel Bakery 天使牌 · 2026 Moon Cake Order (${agent.name})`,
  };
}

export default async function Page(props: PageProps<"/a/[agent]">) {
  const { agent: slug } = await props.params;
  const agent = getAgent(slug);
  if (!agent) notFound();
  return <OrderForm agent={agent} />;
}
