import { parse } from "yaml";

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

export function parsePatchFrontmatter(patchContent: string): ParsedPatch {
  if (!patchContent.trim()) {
    return { frontmatter: {}, body: "" };
  }

  const match = patchContent.match(frontMatterRegex);
  if (!match) {
    return { frontmatter: {}, body: patchContent };
  }

  const [, yamlSection, bodySection] = match;
  const frontmatter: PatchFrontmatter = yamlSection ? (parse(yamlSection) ?? {}) : {};
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

  // Parse upstream into frontmatter + body
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

  // Rule 1: description override
  if (frontmatter.description !== undefined) {
    upstreamFrontmatter["description"] = frontmatter.description;
  }

  // Rule 2+3+4: determine body
  let resultBody = hasBody ? patchBody : upstreamBody;

  // Rule 2: prepend
  if (frontmatter.prepend) {
    resultBody = frontmatter.prepend + resultBody;
  }

  // Rule 3: append
  if (frontmatter.append) {
    resultBody = resultBody + frontmatter.append;
  }

  // Reconstruct YAML front-matter (simple key: value lines, preserve order)
  // Use bare strings for string values; JSON for others
  const yamlLines = Object.entries(upstreamFrontmatter)
    .map(([k, v]) => {
      if (typeof v === "string") return `${k}: ${v}`;
      return `${k}: ${JSON.stringify(v)}`;
    })
    .join("\n");

  return `---\n${yamlLines}\n---\n${resultBody}`;
}
