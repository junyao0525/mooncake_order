// The sales agents who share the order form. Each has their own WhatsApp
// number, so an order taken through their link lands in their chat and is
// tagged with their slug in the dashboard.
//
// Adding an agent is a one-line change here plus a deploy — there is no
// agents table, because this list changes far less often than the code does.

export type Agent = {
  slug: string;
  name: string;
  /** International format, digits only, no leading "+" — used to build wa.me links. */
  whatsapp: string;
};

export const AGENTS = {
  chris: { slug: "chris", name: "Chris", whatsapp: "60105202002" },
  elainey: { slug: "elainey", name: "Elainey", whatsapp: "60186630666" },
  angel: { slug: "angel", name: "Angel", whatsapp: "60167930666" },
} satisfies Record<string, Agent>;

export type AgentSlug = keyof typeof AGENTS;

/** The plain `/` link (menus, posters) goes here. */
export const DEFAULT_AGENT: AgentSlug = "chris";

export const AGENT_LIST: Agent[] = Object.values(AGENTS);

/** Look up an agent by slug. Returns null for anything unrecognised. */
export function getAgent(slug: string | undefined | null): Agent | null {
  if (!slug) return null;
  return (AGENTS as Record<string, Agent>)[slug] ?? null;
}
