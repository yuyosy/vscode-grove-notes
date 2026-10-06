const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers.cjs');

function fixture() {
  const state = { enabled: true, available: true, path: '/notes' };
  const calls = [];
  const callbacks = [];
  const cleared = [];
  const pending = [];
  const originalSet = global.setInterval;
  const originalClear = global.clearInterval;
  global.setInterval = (handler) => { callbacks.push(handler); return callbacks.length; };
  global.clearInterval = (id) => cleared.push(id);
  const { startAutoCommit } = load('src/commands/jj-operations.ts', {
    vscode: { Disposable: class { constructor(fn) { this.dispose = fn; } } },
    '../config': { getNotePath: () => state.path, getUseJujutsu: () => state.enabled, getAutoCommitMessage: () => 'auto' },
    '../utils/jj-resolver': { getJjPath: () => 'jj', isJjAvailable: () => state.available },
    'node:util': { promisify: () => async (_, args) => { calls.push(args[0]); await new Promise((resolve, reject) => pending.push({ resolve, reject })); } },
  });
  return { state, calls, callbacks, cleared, pending, start: () => startAutoCommit(1), restore: () => { global.setInterval = originalSet; global.clearInterval = originalClear; } };
}

test('disabled or unavailable Jujutsu never runs automatic operations', async () => {
  const f = fixture();
  try {
    f.start();
    f.state.enabled = false;
    await f.callbacks[0]();
    f.state.enabled = true;
    f.state.available = false;
    await f.callbacks[0]();
    assert.deepEqual(f.calls, []);
  } finally { f.restore(); }
});

test('an in-flight cycle cannot overlap, including after timer replacement', async () => {
  const f = fixture();
  try {
    const timer = f.start();
    const first = f.callbacks[0]();
    await f.callbacks[0]();
    timer.dispose();
    f.start();
    await f.callbacks[1]();
    assert.deepEqual(f.calls, ['describe']);
    f.pending.shift().resolve();
    await first;
    assert.deepEqual(f.calls, ['describe']);
    assert.deepEqual(f.cleared, [1]);
    const next = f.callbacks[1]();
    f.pending.shift().resolve();
    await new Promise(setImmediate);
    assert.deepEqual(f.calls, ['describe', 'describe', 'new']);
    f.pending.shift().resolve();
    await next;
  } finally { f.restore(); }
});

test('changing notes folder during describe prevents new in the old folder', async () => {
  const f = fixture();
  try {
    f.start();
    const running = f.callbacks[0]();
    f.state.path = '/other';
    f.pending.shift().resolve();
    await running;
    assert.deepEqual(f.calls, ['describe']);
  } finally { f.restore(); }
});
