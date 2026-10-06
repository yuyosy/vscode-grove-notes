const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers.cjs');

function fixture({ dirty = false, changed = false, apply = true, save = true } = {}) {
  let buffer = '---\ntags: [old]\ntitle: Keep\n---\nUnsaved body';
  const edits = [];
  const messages = [];
  let saves = 0;
  const document = { version: 1, isDirty: dirty, isClosed: false, uri: {}, getText: () => buffer, positionAt: (offset) => offset, save: async () => { saves++; return save; } };
  const vscode = {
    Uri: { file: (value) => value },
    Range: class { constructor(start, end) { this.start = start; this.end = end; } },
    WorkspaceEdit: class { replace(uri, range, text) { this.text = text; this.range = range; } },
    workspace: { openTextDocument: async () => document, applyEdit: async (edit) => { edits.push(edit); if (apply) buffer = edit.text; return apply; } },
    window: {
      showErrorMessage: (message) => messages.push(message),
      showWarningMessage: (message) => messages.push(message),
      showInformationMessage: (message) => messages.push(message),
      createQuickPick: () => {
        let accept;
        return { value: 'new', selectedItems: [], onDidAccept: (handler) => { accept = handler; }, onDidHide: () => {}, show: () => { if (changed) document.version++; accept(); }, hide: () => {}, dispose: () => {} };
      },
    },
  };
  const { editTags } = load('src/commands/edit-tags.ts', {
    vscode,
    '../config': { getPredefinedTags: () => [], getScanWorkspaceTags: () => false },
    './list-tags': {},
  });
  return { run: () => editTags('note.md'), edits, messages, buffer: () => buffer, saves: () => saves };
}

test('tag edits preserve a dirty buffer and do not save unrelated changes', async () => {
  const f = fixture({ dirty: true });
  await f.run();
  assert.match(f.buffer(), /title: Keep\n---\nUnsaved body$/);
  assert.match(f.buffer(), /"new"/);
  assert.equal(f.saves(), 0);
});

test('previously clean notes are saved after applying the edit', async () => {
  const f = fixture();
  await f.run();
  assert.equal(f.saves(), 1);
});

test('changes made while the picker is open are never overwritten', async () => {
  const f = fixture({ changed: true });
  await f.run();
  assert.equal(f.edits.length, 0);
  assert.match(f.messages[0], /changed/);
});

test('failed edits and saves do not claim success', async () => {
  for (const options of [{ apply: false }, { save: false }]) {
    const f = fixture(options);
    await f.run();
    assert.equal(f.messages.length, 1);
    assert.match(f.messages[0], /Could not|could not/);
  }
});
