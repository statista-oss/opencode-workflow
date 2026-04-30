import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  root: "./src",
  entry: ["./src/main.ts"],
  copy: ["src/prompt-patch.md", "./agent-skills/skills", "./agent-skills/.claude/commands"],
  dts: true,
  deps: {
    alwaysBundle: ["yaml"],
  },

  publint: true,
  attw: {
    profile: "esm-only",
  },
});

export default config;
