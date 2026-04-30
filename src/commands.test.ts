import { test } from "node:test";
import Assert from "node:assert/strict";
import Path from "node:path";

import { loadCommand } from "./commands.ts";

await test("loadCommand", async () => {
  const command = await loadCommand(
    Path.resolve(import.meta.dirname, "../agent-skills/.claude/commands/build.md"),
  );
  Assert.strictEqual(command?.[0], "build");
  Assert.strictEqual(typeof command?.[1].description, "string");
  Assert.strictEqual(typeof command?.[1].template, "string");
});
