import { test } from "node:test";
import Assert from "node:assert/strict";

import { parsePatchFrontmatter, applyPatch } from "./patch.ts";

// --- parsePatchFrontmatter ---

await test("parsePatchFrontmatter: parses description", () => {
  const input = `---
description: My overridden description
---
`;
  const result = parsePatchFrontmatter(input);
  Assert.strictEqual(result.frontmatter.description, "My overridden description");
  Assert.strictEqual(result.body, "");
});

await test("parsePatchFrontmatter: parses prepend and append", () => {
  const input = `---
prepend: |
  Prepended text.

append: |
  Appended text.
---
`;
  const result = parsePatchFrontmatter(input);
  Assert.strictEqual(result.frontmatter.prepend?.trim(), "Prepended text.");
  Assert.strictEqual(result.frontmatter.append?.trim(), "Appended text.");
  Assert.strictEqual(result.body, "");
});

await test("parsePatchFrontmatter: captures body below front-matter", () => {
  const input = `---
description: New desc
---
This is the replacement body.
`;
  const result = parsePatchFrontmatter(input);
  Assert.strictEqual(result.frontmatter.description, "New desc");
  Assert.ok(result.body.includes("This is the replacement body."));
});

await test("parsePatchFrontmatter: empty string returns empty frontmatter and body", () => {
  const result = parsePatchFrontmatter("");
  Assert.deepEqual(result.frontmatter, {});
  Assert.strictEqual(result.body, "");
});

// --- applyPatch ---

const upstream = `---
description: Original description
---
Original body content.
`;

await test("applyPatch: empty patch returns upstream unchanged", () => {
  Assert.strictEqual(applyPatch(upstream, ""), upstream);
});

await test("applyPatch: patch with no fields returns upstream unchanged", () => {
  const patch = `---
---
`;
  Assert.strictEqual(applyPatch(upstream, patch), upstream);
});

await test("applyPatch: description override replaces upstream description", () => {
  const patch = `---
description: New description
---
`;
  const result = applyPatch(upstream, patch);
  Assert.ok(result.includes("description: New description"));
  Assert.ok(!result.includes("Original description"));
  Assert.ok(result.includes("Original body content."));
});

await test("applyPatch: prepend only — adds text before upstream body", () => {
  const patch = `---
prepend: |
  Prepended line.
---
`;
  const result = applyPatch(upstream, patch);
  Assert.ok(result.includes("Original description"));
  Assert.ok(result.includes("Original body content."));
  // Prepended text should appear before the original body
  const prepIdx = result.indexOf("Prepended line.");
  const bodyIdx = result.indexOf("Original body content.");
  Assert.ok(prepIdx !== -1, "should contain prepended text");
  Assert.ok(
    prepIdx < bodyIdx,
    `prepended text should appear before body, prepIdx=${prepIdx} bodyIdx=${bodyIdx}`,
  );
});

await test("applyPatch: append only — adds text after upstream body", () => {
  const patch = `---
append: |
  Appended line.
---
`;
  const result = applyPatch(upstream, patch);
  Assert.ok(result.includes("Original description"));
  Assert.ok(result.includes("Original body content."));
  Assert.ok(result.endsWith("Appended line.\n") || result.includes("Appended line."));
});

await test("applyPatch: body replace — patch body fully replaces upstream body", () => {
  const patch = `---
---
Replacement body.
`;
  const result = applyPatch(upstream, patch);
  Assert.ok(result.includes("Original description"));
  Assert.ok(!result.includes("Original body content."));
  Assert.ok(result.includes("Replacement body."));
});

await test("applyPatch: all fields — description + prepend + body replace + append", () => {
  const patch = `---
description: Patched description
prepend: |
  Prepend text.
append: |
  Append text.
---
Replaced body.
`;
  const result = applyPatch(upstream, patch);
  Assert.ok(result.includes("Patched description"), "should have new description");
  Assert.ok(!result.includes("Original description"), "should not have old description");
  Assert.ok(!result.includes("Original body content."), "should not have old body");
  Assert.ok(result.includes("Replaced body."), "should have replaced body");
  Assert.ok(result.includes("Prepend text."), "should have prepend");
  Assert.ok(result.includes("Append text."), "should have append");
  // Prepend should appear before body, append after
  const prepIdx = result.indexOf("Prepend text.");
  const bodyIdx = result.indexOf("Replaced body.");
  const appendIdx = result.indexOf("Append text.");
  Assert.ok(prepIdx < bodyIdx, "prepend before body");
  Assert.ok(bodyIdx < appendIdx, "body before append");
});

await test("applyPatch: description with colon round-trips correctly", () => {
  const patch = `---
description: "Build — run lint: test, and ship"
---
`;
  const result = applyPatch(upstream, patch);
  // The description must parse back to the exact string (colon must not corrupt YAML)
  const reparsed = parsePatchFrontmatter(
    `---\n${result.slice(4, result.indexOf("\n---\n"))}\n---\n`,
  );
  Assert.strictEqual(reparsed.frontmatter.description, "Build — run lint: test, and ship");
  Assert.ok(result.includes("Original body content."));
});

await test("parsePatchFrontmatter: throws for non-string prepend field", () => {
  const input = `---
prepend:
  - item1
  - item2
---
`;
  Assert.throws(() => parsePatchFrontmatter(input), /Patch field 'prepend' must be a string/);
});

await test("parsePatchFrontmatter: throws for non-string description field", () => {
  const input = `---
description: 42
---
`;
  Assert.throws(() => parsePatchFrontmatter(input), /Patch field 'description' must be a string/);
});
