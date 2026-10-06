import { isMap, isScalar, isSeq, parseDocument } from 'yaml';

export interface FrontMatter {
  tags: string[];
  [key: string]: unknown;
}

function getFrontMatter(text: string) {
  const match =
    /^(\uFEFF?---[ \t]*\r?\n)([\s\S]*?)(^(?:---|\.\.\.)[ \t]*(?:\r?\n|$))/m.exec(
      text,
    );
  return match?.index === 0 ? match : null;
}

/** Reads tags using YAML syntax, including quoted commas and special characters. */
export function parseFrontMatter(text: string): FrontMatter | null {
  const match = getFrontMatter(text);
  if (!match) return null;
  const document = parseDocument(match[2]);
  if (document.errors.length > 0 || !isMap(document.contents)) return null;
  const tags = document.get('tags', true);
  return {
    tags: isSeq(tags)
      ? tags.items.flatMap((item) =>
          isScalar(item) && typeof item.value === 'string' ? [item.value] : [],
        )
      : [],
  };
}

/** Replaces only the tags field; all other metadata and the body stay intact. */
export function writeTags(text: string, tags: string[]): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  let tagBlock = tags.length
    ? `tags:${eol}${tags.map((tag) => `  - ${JSON.stringify(tag)}`).join(eol)}`
    : 'tags: []';
  const match = getFrontMatter(text);
  if (!match) {
    if (/^\uFEFF?---[ \t]*(?:\r?\n|$)/.test(text)) {
      throw new Error('Front matter has no closing delimiter.');
    }
    const bom = text.startsWith('\uFEFF') ? '\uFEFF' : '';
    return `${bom}---${eol}${tagBlock}${eol}---${eol}${eol}${text.slice(bom.length)}`;
  }

  const block = match[2];
  const document = parseDocument(block);
  if (
    document.errors.length > 0 ||
    (document.contents && !isMap(document.contents))
  ) {
    throw new Error('Cannot edit tags in invalid YAML front matter.');
  }
  const pair = isMap(document.contents)
    ? document.contents.items.find(
        (item) => isScalar(item.key) && item.key.value === 'tags',
      )
    : undefined;
  let newBlock: string;
  if (pair && isScalar(pair.key) && pair.key.range) {
    const keyStart = pair.key.range[0];
    const start = block.lastIndexOf('\n', keyStart - 1) + 1;
    const indentation = block.slice(start, keyStart);
    const value = pair.value;
    if ((isScalar(value) || isSeq(value) || isMap(value)) && value.anchor) {
      tagBlock = tagBlock.replace('tags:', () => `tags: &${value.anchor}`);
    }
    tagBlock = tagBlock
      .split(eol)
      .map((line) => `${indentation}${line}`)
      .join(eol);
    const lineEnd = block.indexOf('\n', start);
    const end = Math.max(
      pair.value?.range?.[2] ?? 0,
      lineEnd < 0 ? block.length : lineEnd + 1,
    );
    newBlock = `${block.slice(0, start)}${tagBlock}${eol}${block.slice(end)}`;
  } else {
    const firstKey = isMap(document.contents)
      ? document.contents.items[0]?.key
      : undefined;
    if (isScalar(firstKey) && firstKey.range) {
      const start = firstKey.range[0];
      const indentation = block.slice(
        block.lastIndexOf('\n', start - 1) + 1,
        start,
      );
      tagBlock = tagBlock
        .split(eol)
        .map((line) => `${indentation}${line}`)
        .join(eol);
    }
    newBlock = `${block}${block && !block.endsWith('\n') ? eol : ''}${tagBlock}${eol}`;
  }
  return `${match[1]}${newBlock}${text.slice(match[1].length + block.length)}`;
}
