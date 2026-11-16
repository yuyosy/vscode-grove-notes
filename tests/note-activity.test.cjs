const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { load } = require('./helpers.cjs');

const { NoteActivity } = load('src/note-activity.ts');

function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grove-activity-'));
  t.after(() => fs.rmSync(dir, { recursive: true }));
  const saved = new Map();
  const state = {
    get: (key, fallback) => saved.get(key) ?? fallback,
    update: async (key, value) => {
      saved.set(key, structuredClone(value));
    },
  };
  return {
    createActivity: () => new NoteActivity(state, () => {}),
    seedRecent: (root, file) => {
      const key = process.platform === 'win32' ? root.toLowerCase() : root;
      saved.set(`noteActivity:${key}`, { recent: [path.relative(root, file)] });
    },
    root: (name) => path.join(dir, name),
    write: (name, content = '') => {
      const file = path.join(dir, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
      return file;
    },
  };
}

test('recent notes are distinct, limited and persisted per notes folder', (t) => {
  const fixture = setup(t);
  const activity = fixture.createActivity();
  const root = fixture.root('notes');
  const files = Array.from({ length: 22 }, (_, i) =>
    fixture.write(`notes/${i}.md`),
  );
  for (const file of files) activity.record(root, file, true);
  activity.record(root, files[17], true);
  const ignored = fixture.write('notes/ignored.md');
  fixture.write('notes/.gitignore', 'ignored.md\n');
  activity.record(root, ignored, true);
  activity.record(root, fixture.write('notes/.jj/internal.md'), false);
  const other = fixture.write('notes-extra/other.md');
  activity.record(root, other, false);
  activity.record(fixture.root('notes-extra'), other, true);

  const restored = fixture.createActivity();
  assert.deepEqual(restored.getVisibleEntries(root, true).recent, [
    files[17],
    ...files
      .slice(2)
      .reverse()
      .filter((file) => file !== files[17]),
  ]);
  assert.deepEqual(
    restored.getVisibleEntries(fixture.root('notes-extra'), true).recent,
    [other],
  );
});

test('history follows renamed folders and deleted notes are removed', (t) => {
  const fixture = setup(t);
  const activity = fixture.createActivity();
  const root = fixture.root('notes');
  const note = fixture.write('notes/topic/note.md');
  activity.record(root, note, false);

  const from = path.join(root, 'topic');
  const to = path.join(root, 'renamed');
  fs.renameSync(from, to);
  activity.updatePath(root, from, to);
  const renamed = path.join(to, 'note.md');
  const restored = fixture.createActivity();
  assert.deepEqual(restored.getVisibleEntries(root, false).recent, [renamed]);
  fs.unlinkSync(renamed);
  assert.deepEqual(restored.getVisibleEntries(root, false).recent, []);
  restored.updatePath(root, renamed);
  fs.writeFileSync(renamed, '');
  assert.deepEqual(restored.getVisibleEntries(root, false).recent, []);
});

test('pins preserve prior history and follow renamed or deleted notes', (t) => {
  const fixture = setup(t);
  const root = fixture.root('notes');
  const note = fixture.write('notes/topic/note.md');
  fixture.seedRecent(root, note);

  const activity = fixture.createActivity();
  assert.deepEqual(activity.getVisibleEntries(root, false), {
    pinned: [],
    recent: [note],
  });
  activity.setPinned(root, note, true);
  activity.setPinned(root, note, true);

  const from = path.join(root, 'topic');
  const to = path.join(root, 'renamed');
  fs.renameSync(from, to);
  activity.updatePath(root, from, to);
  const renamed = path.join(to, 'note.md');
  const restored = fixture.createActivity();
  assert.deepEqual(restored.getVisibleEntries(root, false), {
    pinned: [renamed],
    recent: [renamed],
  });
  assert.deepEqual(restored.getVisibleEntries(root, false, 0), {
    pinned: [renamed],
    recent: [],
  });
  assert.equal(restored.isPinned(root, renamed), true);
  restored.setPinned(root, renamed, false);
  assert.deepEqual(restored.getVisibleEntries(root, false), {
    pinned: [],
    recent: [renamed],
  });
  restored.setPinned(root, renamed, true);
  fs.unlinkSync(renamed);
  restored.updatePath(root, renamed);
  fs.writeFileSync(renamed, '');
  assert.deepEqual(restored.getVisibleEntries(root, false), {
    pinned: [],
    recent: [],
  });
});

test('the display limit supports more than 20 notes and can hide history without clearing it', (t) => {
  const fixture = setup(t);
  const activity = fixture.createActivity();
  const root = fixture.root('notes');
  const files = Array.from({ length: 23 }, (_, i) =>
    fixture.write(`notes/${i}.md`),
  );
  for (const file of files.slice(0, 22)) activity.record(root, file, false, 22);

  assert.deepEqual(
    activity.getVisibleEntries(root, false, 4).recent,
    files.slice(18, 22).reverse(),
  );
  assert.deepEqual(activity.getVisibleEntries(root, false, 0).recent, []);
  activity.record(root, files[22], false, 0);
  assert.deepEqual(
    activity.getVisibleEntries(root, false, 22).recent,
    files.slice(1).reverse(),
  );
});
