import type { AgentTool } from "../../types";

/**
 * The provider icon store. Marks are self-hosted under `public/agents/`
 * (source: @lobehub/icons-static-svg, recolored to the mono theme;
 * Crush and Factory are local monograms, the shared agents dir a
 * prompt glyph). Every skills-folder enum value has an entry — adding
 * a tool adapter means adding its mark here too.
 */
export const PROVIDERS: Record<AgentTool, { label: string; icon: string }> = {
  claude: { label: "Claude", icon: "/agents/claude.svg" },
  agents: { label: "Agents", icon: "/agents/agents.svg" },
  copilot: { label: "Copilot", icon: "/agents/copilot.svg" },
  crush: { label: "Crush", icon: "/agents/crush.svg" },
  cursor: { label: "Cursor", icon: "/agents/cursor.svg" },
  factory: { label: "Factory", icon: "/agents/factory.svg" },
  gemini: { label: "Gemini", icon: "/agents/gemini.svg" },
  junie: { label: "Junie", icon: "/agents/junie.svg" },
  kiro: { label: "Kiro", icon: "/agents/kiro.svg" },
  opencode: { label: "OpenCode", icon: "/agents/opencode.svg" },
  roo: { label: "Roo", icon: "/agents/roo.svg" },
};

export function provider(tool: AgentTool) {
  return PROVIDERS[tool] ?? { label: tool, icon: "/agents/agents.svg" };
}
