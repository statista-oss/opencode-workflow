import type { Config, Plugin } from "@opencode-ai/plugin";
import Fs from "node:fs/promises";
import Path from "node:path";
import { loadCommands } from "./commands";

type ConfigWithPaths = Config & { skills?: { paths?: string[] } };

const skillsDir = Path.resolve(import.meta.dirname, "./skills");

const promptPatch = await Fs.readFile(
  Path.resolve(import.meta.dirname, "./prompt-patch.md"),
  "utf8",
);

export const OpencodeWorkflowPlugin: Plugin = async () => {
  return {
    config: async (config: ConfigWithPaths) => {
      config.skills ??= {};
      config.skills.paths ??= [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }

      config.command = {
        ...config.command,
        ...(await loadCommands()),
      };
    },
    "experimental.chat.system.transform": async (input, output) => {
      output.system.push(promptPatch);
    },
  };
};
