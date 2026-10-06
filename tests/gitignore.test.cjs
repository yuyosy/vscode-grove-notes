const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { load } = require('./helpers.cjs');
const { walkDir, readDirEntries, SYSTEM_IGNORE_PATTERNS } = load('src/utils/file-utils.ts');
const { buildTagIndex } = load('src/utils/tag-index.ts');

function withVault(files, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grove-ignore-'));
  try {
    for (const [relative, content] of Object.entries(files)) {
      const file = path.join(dir, relative);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
    run(dir);
  } finally {
    assert.equal(path.dirname(dir), os.tmpdir());
    fs.rmSync(dir, { recursive: true });
  }
}

function relativeNotes(dir, files) {
  return files.filter((file) => file.endsWith('.md')).map((file) => path.relative(dir, file).replaceAll('\\', '/')).sort();
}

test('directory rules, root anchoring and ordered negations match in scan and tree', () => {
  withVault({
    '.gitignore': 'archive/\n/root.md\n*.tmp.md\n!keep.tmp.md\nnested/private.md\n',
    'archive/note.md': '', 'nested/archive/note.md': '', 'root.md': '',
    'nested/root.md': '', 'hidden.tmp.md': '', 'keep.tmp.md': '',
    'nested/private.md': '', 'nested/public.md': '',
  }, (dir) => {
    const expected = ['keep.tmp.md', 'nested/public.md', 'nested/root.md'];
    assert.deepEqual(relativeNotes(dir, walkDir(dir, [], true)), expected);
    const visible = [];
    const visit = (current) => {
      for (const entry of readDirEntries(current, [], dir, true)) {
        if (entry.isDirectory) visit(entry.fullPath);
        else visible.push(entry.fullPath);
      }
    };
    visit(dir);
    assert.deepEqual(relativeNotes(dir, visible), expected);
  });
});

test('nested ignore files can override file rules but cannot revive an excluded parent', () => {
  withVault({
    '.gitignore': '*.md\nexcluded/\n',
    'nested/.gitignore': '!keep.md\n',
    'nested/keep.md': '', 'nested/hide.md': '',
    'excluded/.gitignore': '!note.md\n', 'excluded/note.md': '',
  }, (dir) => {
    assert.deepEqual(relativeNotes(dir, walkDir(dir, [], true)), ['nested/keep.md']);
    assert.deepEqual(relativeNotes(dir, readDirEntries(path.join(dir, 'excluded'), [], dir, true).map((entry) => entry.fullPath)), []);
  });
});

test('escaped comment markers and spaces retain their Gitignore meaning', () => {
  withVault({
    '.gitignore': '# comment\n\\#secret.md\nspace.md   \n',
    '#secret.md': '', 'space.md': '', 'keep.md': '',
  }, (dir) => {
    assert.deepEqual(relativeNotes(dir, walkDir(dir, [], true)), ['keep.md']);
  });
});

test('disabling Gitignore restores files while hard exclusions still protect metadata', () => {
  withVault({
    '.gitignore': 'hidden.md\n!.git/\n',
    'hidden.md': '', '.git/internal.md': '', '.jj/internal.md': '', 'keep.md': '',
  }, (dir) => {
    assert.deepEqual(relativeNotes(dir, walkDir(dir, [...SYSTEM_IGNORE_PATTERNS], true)), ['keep.md']);
    assert.deepEqual(relativeNotes(dir, walkDir(dir, [...SYSTEM_IGNORE_PATTERNS], false)), ['hidden.md', 'keep.md']);
  });
});

test('tag scanning shares the same Gitignore rules as file listing', () => {
  const note = '---\ntags: [work]\n---\nBody';
  withVault({ '.gitignore': '*.md\n!keep.md\n', 'keep.md': note, 'hidden.md': note }, (dir) => {
    assert.deepEqual(relativeNotes(dir, buildTagIndex(dir, [], true).work), ['keep.md']);
    assert.deepEqual(relativeNotes(dir, buildTagIndex(dir, [], false).work), ['hidden.md', 'keep.md']);
  });
});

test('view globs containing a directory are evaluated relative to the notes root', () => {
  withVault({ 'nested/hide.md': '', 'nested/keep.md': '' }, (dir) => {
    const entries = readDirEntries(path.join(dir, 'nested'), ['nested/hide.md'], dir);
    assert.deepEqual(entries.map((entry) => entry.name), ['keep.md']);
  });
});
