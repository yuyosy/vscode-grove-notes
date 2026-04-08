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
  const blockMatch = yamlBlock.match(/^tags\s*:([\s\S]*?)(?=^\S|Z)/m);
  if (blockMatch) {
    const lines = blockMatch[1].split('\n');
    const tags: string[] = [];
    for (const line of lines) {
      const item = line.match(/^\s+-\s+['"]?(.+?)['"]?\s*$/);
      if (item) tags.push(item[1].trim());
    }
    return tags;
  }

  return [];
}
