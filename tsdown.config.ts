import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  root: "./src",
  entry: ["./src/main.ts"],
  copy: [
    "./agent-skills/.claude/commands",
    "./agent-skills/agents",
    "./agent-skills/references",
    "./agent-skills/skills",
    "./src/prompt-patch.md",
  ],
  dts: true,
  deps: {
    onlyBundle: ["yaml"],
    alwaysBundle: ["yaml"],
  },

  publint: true,
  attw: {
    profile: "esm-only",
  },
});

export default config;
