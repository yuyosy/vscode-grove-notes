const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers.cjs');
const { parseFrontMatter, writeTags } = load('src/utils/front-matter.ts');

test('editing tags preserves adjacent metadata, comments, nested fields and body', () => {
  for (const oldTags of ['tags: []', 'tags:\n  - old', 'tags:']) {
    const input = `---\n# Header\n${oldTags}\ntitle: Keep\nmetadata:\n  author: Someone\n---\n# Body\n`;
    const output = writeTags(input, ['new']);
    assert.equal(output, '---\n# Header\ntags:\n  - "new"\ntitle: Keep\nmetadata:\n  author: Someone\n---\n# Body\n');
    assert.deepEqual(parseFrontMatter(output).tags, ['new']);
  }
});

test('tags with YAML special characters round trip without changing their meaning', () => {
  const tags = ['a,b', 'project: alpha', '#ideas', 'true', '01', 'a"b', "it's", 'line\nbreak', '__proto__'];
  assert.deepEqual(parseFrontMatter(writeTags('Body', tags)).tags, tags);
  assert.deepEqual(parseFrontMatter('---\ntags: ["a,b", "#ideas"]\n---\nBody').tags, ['a,b', '#ideas']);
});

test('CRLF, BOM, empty tags, existing fields and closing delimiter are preserved', () => {
  const input = '\uFEFF---\r\ntitle: Keep\r\ntags: [old]\r\n...\r\nBody\r\n';
  assert.equal(writeTags(input, []), '\uFEFF---\r\ntitle: Keep\r\ntags: []\r\n...\r\nBody\r\n');
  assert.equal(writeTags('---\ntitle: Keep\n---\nBody', []), '---\ntitle: Keep\ntags: []\n---\nBody');
});

test('malformed YAML and missing delimiters fail without rewriting content', () => {
  for (const text of ['---\ntags: [broken\n---\nBody', '---\ntags: []\nBody', '---\n- list\n---\nBody']) {
    assert.throws(() => writeTags(text, ['new']));
  }
  assert.equal(parseFrontMatter('Body\n---\ntags: []\n---'), null);
});

test('indented metadata remains valid when tags are replaced or inserted', () => {
  for (const text of ['---\n    title: Keep\n    tags: []\n---\nBody', '---\n    title: Keep\n---\nBody']) {
    const result = writeTags(text, ['new']);
    assert.deepEqual(parseFrontMatter(result).tags, ['new']);
    assert.match(result, /    title: Keep\n/);
  }
});

test('anchors on the tags field survive so other metadata aliases remain valid', () => {
  const { parse } = require('yaml');
  for (const tags of [['new'], []]) {
    const result = writeTags('---\ntags: &tagList [old]\nrelated: *tagList\n---\nBody', tags);
    const metadata = parse(result.split('---\n')[1]);
    assert.deepEqual(metadata.tags, tags);
    assert.deepEqual(metadata.related, tags);
    assert.match(result, /related: \*tagList\n/);
  }
});
