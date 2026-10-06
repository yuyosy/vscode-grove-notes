const assert = require('node:assert/strict');
const { test } = require('node:test');
const { activateFixture } = require('./extension-fixture.cjs');

test('the startup timer is replaced and stops when the interval becomes zero', () => {
  const f = activateFixture();
  f.state.interval = 2;
  f.change('grove-notes.versionControl.autoCommitInterval');
  assert.deepEqual(f.timers.map((timer) => [timer.interval, timer.disposed]), [[1, true], [2, false]]);
  f.state.interval = 0;
  f.change('grove-notes.versionControl.autoCommitInterval');
  assert.ok(f.timers.every((timer) => timer.disposed));
  f.dispose();
});

test('disabling Jujutsu stops the timer and enabling it creates only one replacement', () => {
  const f = activateFixture();
  f.state.enabled = false;
  f.change('grove-notes.versionControl.useJujutsu');
  assert.ok(f.timers[0].disposed);
  assert.equal(f.timers.length, 1);
  f.state.enabled = true;
  f.change('grove-notes.versionControl.useJujutsu');
  assert.equal(f.timers.length, 2);
  f.dispose();
  assert.ok(f.timers.every((timer) => timer.disposed));
});

test('startup without Jujutsu or a notes folder creates no timer', () => {
  for (const overrides of [{ enabled: false }, { available: false }, { path: '' }]) {
    const f = activateFixture(overrides);
    assert.equal(f.timers.length, 0);
    f.dispose();
  }
});
