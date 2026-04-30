import Fs from "node:fs/promises";
import Paths from "node:path";
import { parse } from "yaml";
import type { Config } from "@opencode-ai/plugin";

type Commands = NonNullable<Config["command"]>;

const frontMatterRegex = /^---(.*?\n)---\n(.*)/s;

export async function loadCommands(): Promise<Commands> {
  const commands: Commands = {};

  const commandsDir = Paths.resolve(import.meta.dirname, "./commands");
  for await (const command of Fs.glob(`${commandsDir}/*.md`)) {
    const content = await Fs.readFile(command, "utf-8");
    const match = content.match(frontMatterRegex);
    if (!match) continue;

    const header = parse(match[0]);
    const prompt = match[1];
    if (!prompt) continue;

    commands[header.name] = {
      description: header.description,
      template: prompt,
    };
  }
  return commands;
}
