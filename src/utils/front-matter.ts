/**
 * Parses YAML front matter from a Markdown file's text content.
 * Only handles the subset needed: `tags` as an array.
 *
 * Supports two common YAML array styles:
 *   tags: [foo, bar]
 *   tags:
 *     - foo
 *     - bar
 */
export interface FrontMatter {
  tags: string[];
  [key: string]: unknown;
}

export function parseFrontMatter(text: string): FrontMatter | null {
  // Must start with ---
  if (!text.startsWith('---')) return null;

  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;

  const block = text.slice(3, end).trim();

  const tags = extractTags(block);
  return { tags };
}

function extractTags(yamlBlock: string): string[] {
  // Inline array style: tags: [foo, bar]
  const inlineMatch = yamlBlock.match(/^tags\s*:\s*\[([^\]]*)\]/m);
  if (inlineMatch) {
    return inlineMatch[1]
      .split(',')
      .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  // Block list style:
  //   tags:
  //     - foo
  // Walk line-by-line to avoid regex end-of-string issues.
  const lines = yamlBlock.split('\n');
  const tagsLineIdx = lines.findIndex((l) => /^tags\s*:/.test(l));
  if (tagsLineIdx === -1) return [];

  const tags: string[] = [];
  for (let i = tagsLineIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trimEnd();
    // Stop if we hit a non-indented, non-empty line (another YAML key)
    if (trimmed.length > 0 && !/^\s/.test(trimmed)) break;
    const item = trimmed.match(/^\s+-\s+['"]?(.+?)['"]?\s*$/);
    if (item) tags.push(item[1].trim());
  }
  return tags;
}

/**
 * Writes (or replaces) the `tags` field in a file's YAML front matter.
 *
 * - If the file has no front matter, prepends one.
 * - If a `tags:` key exists, replaces it in place.
 * - Other front matter fields are preserved unchanged.
 * - Uses block-list style:
 *     tags:
 *       - foo
 *       - bar
 */
export function writeTags(filePath: string, tags: string[]): void {
  const fs = require('node:fs') as typeof import('node:fs');
  let text: string;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  const tagBlock =
    tags.length === 0
      ? 'tags: []'
      : `tags:\n${tags.map((t) => `  - ${t}`).join('\n')}`;

  const fmStart = text.startsWith('---');
  const fmEnd = fmStart ? text.indexOf('\n---', 3) : -1;

  if (fmStart && fmEnd !== -1) {
    const block = text.slice(3, fmEnd).trim();
    const tagsRe = /^tags\s*:.*(?:\n(?:[ \t]+.*)*)*/m;
    const newBlock = tagsRe.test(block)
      ? block.replace(tagsRe, tagBlock)
      : `${block}\n${tagBlock}`;
    const rest = text.slice(fmEnd + 4); // skip closing \n---
    fs.writeFileSync(filePath, `---\n${newBlock}\n---${rest}`, 'utf8');
  } else {
    // No front matter — prepend
    fs.writeFileSync(filePath, `---\n${tagBlock}\n---\n\n${text}`, 'utf8');
  }
}
