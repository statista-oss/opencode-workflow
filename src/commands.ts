import Fs from "node:fs/promises";
import Path from "node:path";
import { parse } from "yaml";
import type { Config } from "@opencode-ai/plugin";

type Commands = NonNullable<Config["command"]>;

const frontMatterRegex = /^---(.*?\n)---\n(.*)/s;

export async function loadCommands(): Promise<Commands> {
  const commands: Commands = {};

  const commandsDir = Path.resolve(import.meta.dirname, "./commands");
  for await (const path of Fs.glob(`${commandsDir}/*.md`)) {
    const command = await loadCommand(path);
    if (!command) continue;

    const [name, config] = command;
    commands[name] = config;
  }

  return commands;
}

export async function loadCommand(
  path: string,
): Promise<[name: string, config: Commands[string]] | undefined> {
  const content = await Fs.readFile(path, "utf-8");
  const match = content.match(frontMatterRegex);
  if (!match) return;
  const [, frontmatter, prompt] = match;
  if (!frontmatter) return;
  if (!prompt) return;

  const header = parse(frontmatter);

  return [
    Path.basename(path, ".md"),
    {
      description: header.description,
      template: prompt,
    },
  ];
}
