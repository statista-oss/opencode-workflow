import Fs from "node:fs/promises";
import Path from "node:path";
import { defineConfig, type UserConfig } from "tsdown";
import { applyPatch } from "./src/patch.ts";

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

  async onSuccess() {
    const commandsDir = Path.resolve(import.meta.dirname, "dist/commands");
    const patchesDir = Path.resolve(import.meta.dirname, "src/command-patches");

    let commandFiles: string[];
    try {
      commandFiles = await Fs.readdir(commandsDir);
    } catch {
      // dist/commands does not exist yet — nothing to patch
      return;
    }

    for (const file of commandFiles) {
      if (!file.endsWith(".md")) continue;

      const patchPath = Path.join(patchesDir, file);
      let patchContent: string;
      try {
        patchContent = await Fs.readFile(patchPath, "utf-8");
      } catch {
        // No patch for this command — leave it unchanged
        continue;
      }

      const upstreamPath = Path.join(commandsDir, file);
      const upstream = await Fs.readFile(upstreamPath, "utf-8");

      let merged: string;
      try {
        merged = applyPatch(upstream, patchContent);
      } catch (err) {
        throw new Error(
          `Failed to apply patch for ${file}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      await Fs.writeFile(upstreamPath, merged, "utf-8");
      console.log(`[patch] Applied patch: dist/commands/${file}`);
    }
  },
});

export default config;
