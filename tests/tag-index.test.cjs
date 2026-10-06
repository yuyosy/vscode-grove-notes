const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { load } = require('./helpers.cjs');
const { buildTagIndex } = load('src/utils/tag-index.ts');

test('inherited object names are valid tags and duplicate tags count a note once', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grove-tags-'));
  try {
    const file = path.join(dir, 'note.md');
    fs.writeFileSync(file, '---\ntags: [constructor, __proto__, toString, constructor]\n---\nBody');
    const index = buildTagIndex(dir, []);
    assert.deepEqual(Object.keys(index).sort(), ['__proto__', 'constructor', 'toString']);
    for (const tag of Object.keys(index)) assert.deepEqual(index[tag], [file]);
    assert.equal(Object.getPrototypeOf(index), null);
  } finally {
    assert.equal(path.dirname(dir), os.tmpdir());
    fs.rmSync(dir, { recursive: true });
  }
});
