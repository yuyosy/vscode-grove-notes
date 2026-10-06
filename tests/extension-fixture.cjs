const { load } = require('./helpers.cjs');

exports.activateFixture = (overrides = {}) => {
  const state = { interval: 1, path: '/notes', enabled: true, available: true, ...overrides };
  const timers = [];
  const watchers = [];
  const subscriptions = [];
  let onConfig;
  let refreshes = 0;
  const vscode = {
    Disposable: class { constructor(fn) { this.dispose = fn; } },
    RelativePattern: class { constructor(base) { this.base = base; } },
    commands: { executeCommand: () => {}, registerCommand: () => ({ dispose() {} }) },
    window: { createTreeView: () => ({ dispose() {} }), showWarningMessage: async () => undefined },
    workspace: {
      registerTextDocumentContentProvider: () => ({ dispose() {} }),
      onDidChangeConfiguration: (handler) => { onConfig = handler; return { dispose() {} }; },
      createFileSystemWatcher: (pattern) => {
        const watcher = { base: pattern.base, disposed: false, dispose() { this.disposed = true; }, onDidCreate(fn) { this.create = fn; }, onDidChange(fn) { this.change = fn; }, onDidDelete(fn) { this.delete = fn; } };
        watchers.push(watcher);
        return watcher;
      },
    },
  };
  const noop = new Proxy({}, { get: () => () => {} });
  const mocks = { vscode };
  for (const name of ['copy-path', 'delete-item', 'edit-tags', 'list-notes', 'list-tags', 'new-folder', 'new-note', 'open-gitignore', 'open-preview', 'rename-item', 'reveal-in-explorer', 'setup', 'view-diff']) mocks[`./commands/${name}`] = noop;
  mocks['./commands/jj-operations'] = { ...noop, startAutoCommit: (interval) => { const timer = { interval, disposed: false, dispose() { this.disposed = true; } }; timers.push(timer); return timer; } };
  mocks['./config'] = { getAutoCommitInterval: () => state.interval, getNotePath: () => state.path, getUseJujutsu: () => state.enabled, getJjPathSetting: () => '' };
  mocks['./utils/jj-resolver'] = { initJjPath() {}, isJjAvailable: () => state.available };
  mocks['./utils/jj-content-provider'] = { JJ_PARENT_SCHEME: 'jj', JjParentContentProvider: class {} };
  mocks['./notes-tree-provider'] = { NotesTreeProvider: class { refresh() { refreshes++; } } };
  load('src/extension.ts', mocks).activate({ subscriptions, extension: { id: 'grove-notes' } });
  return {
    state, timers, watchers,
    refreshes: () => refreshes,
    change: (...keys) => onConfig({ affectsConfiguration: (key) => keys.includes(key) }),
    dispose: () => subscriptions.forEach((subscription) => subscription.dispose()),
  };
};
