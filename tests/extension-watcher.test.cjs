const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { activateFixture } = require('./extension-fixture.cjs');

test('file events refresh notes even when Jujutsu is disabled or unavailable', () => {
  for (const overrides of [{ enabled: false }, { available: false }]) {
    const f = activateFixture(overrides);
    assert.equal(f.watchers.length, 1);
    for (const event of ['create', 'change', 'delete']) f.watchers[0][event]({ fsPath: path.join(f.state.path, 'note.md') });
    assert.equal(f.refreshes(), 3);
    f.dispose();
    assert.ok(f.watchers[0].disposed);
  }
});

test('changing or clearing the notes folder replaces or stops its watcher', () => {
  const f = activateFixture({ enabled: false });
  f.state.path = '/other';
  f.change('grove-notes.notePath');
  assert.ok(f.watchers[0].disposed);
  assert.equal(f.watchers[1].base, '/other');
  f.state.path = '';
  f.change('grove-notes.notePath');
  assert.ok(f.watchers[1].disposed);
  assert.equal(f.watchers.length, 2);
  f.dispose();
});

test('metadata is excluded by path component without excluding .gitignore notes', () => {
  const f = activateFixture({ enabled: false });
  for (const relative of ['.git/config', '.jj/repo', 'nested/.git/config']) f.watchers[0].change({ fsPath: path.join(f.state.path, relative) });
  assert.equal(f.refreshes(), 0);
  for (const relative of ['.gitignore', '.jj-notes.md', 'note.md']) f.watchers[0].change({ fsPath: path.join(f.state.path, relative) });
  assert.equal(f.refreshes(), 3);
  f.dispose();
});
