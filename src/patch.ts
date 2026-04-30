import { parse, stringify } from "yaml";

export type PatchFrontmatter = {
  description?: string;
  prepend?: string;
  append?: string;
};

export type ParsedPatch = {
  frontmatter: PatchFrontmatter;
  body: string;
};

const frontMatterRegex = /^---(.*?\n)---([\s\S]*)$/s;

function assertOptionalString(val: unknown, field: string): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== "string")
    throw new Error(`Patch field '${field}' must be a string, got ${typeof val}`);
  return val;
}

export function parsePatchFrontmatter(patchContent: string): ParsedPatch {
  if (!patchContent.trim()) {
    return { frontmatter: {}, body: "" };
  }

  const match = patchContent.match(frontMatterRegex);
  if (!match) {
    return { frontmatter: {}, body: patchContent };
  }

  const [, yamlSection, bodySection] = match;
  const raw: Record<string, unknown> = yamlSection ? (parse(yamlSection) ?? {}) : {};

  const frontmatter: PatchFrontmatter = {};
  const description = assertOptionalString(raw["description"], "description");
  if (description !== undefined) frontmatter.description = description;
  const prepend = assertOptionalString(raw["prepend"], "prepend");
  if (prepend !== undefined) frontmatter.prepend = prepend;
  const append = assertOptionalString(raw["append"], "append");
  if (append !== undefined) frontmatter.append = append;

  const body = bodySection ? bodySection.replace(/^\n/, "") : "";

  return { frontmatter, body };
}

export function applyPatch(upstream: string, patch: string): string {
  if (!patch.trim()) {
    return upstream;
  }

  const { frontmatter, body: patchBody } = parsePatchFrontmatter(patch);
  const hasFields =
    frontmatter.description !== undefined ||
    frontmatter.prepend !== undefined ||
    frontmatter.append !== undefined;
  const hasBody = patchBody.trim().length > 0;

  if (!hasFields && !hasBody) {
    return upstream;
  }

  // Parse upstream into front-matter + body
  const upstreamMatch = upstream.match(frontMatterRegex);
  if (!upstreamMatch) {
    throw new Error("Upstream command does not have valid front-matter");
  }

  const [, upstreamYaml, upstreamBodyWithLeadingNewline] = upstreamMatch;
  const upstreamFrontmatter: Record<string, unknown> = upstreamYaml
    ? (parse(upstreamYaml) ?? {})
    : {};
  const upstreamBody = upstreamBodyWithLeadingNewline
    ? upstreamBodyWithLeadingNewline.replace(/^\n/, "")
    : "";

  // Rule 2 (spec): replace upstream description if patch provides one
  if (frontmatter.description !== undefined) {
    upstreamFrontmatter.description = frontmatter.description;
  }

  // Rule 4 (spec): patch body fully replaces upstream body when non-empty
  let resultBody = hasBody ? patchBody : upstreamBody;

  // Rule 3 (spec): insert prepend before body
  if (frontmatter.prepend) {
    resultBody = frontmatter.prepend + resultBody;
  }

  // Rule 5 (spec): append after body
  if (frontmatter.append) {
    resultBody = resultBody + frontmatter.append;
  }

  // Serialize front-matter with the yaml library to preserve quoting correctness
  const yamlStr = stringify(upstreamFrontmatter).trimEnd();

  return `---\n${yamlStr}\n---\n${resultBody}`;
}
