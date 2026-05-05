import * as path from 'node:path';
import * as vscode from 'vscode';
import { copyPath } from './commands/copy-path';
import { deleteItem } from './commands/delete-item';
import { editTags } from './commands/edit-tags';
import {
  jjDescribe,
  jjFetch,
  jjNew,
  jjPush,
  jjRedo,
  jjUndo,
  startAutoCommit,
} from './commands/jj-operations';
import { listNotes } from './commands/list-notes';
import { listTags } from './commands/list-tags';
import { newNote } from './commands/new-note';
import { openGitignore } from './commands/open-gitignore';
import { openPreview } from './commands/open-preview';
import { renameItem } from './commands/rename-item';
import { revealInExplorer } from './commands/reveal-in-explorer';
import { maybeInitJj, selectNotesFolder, setupNotes } from './commands/setup';
import { viewDiff } from './commands/view-diff';
import {
  getAutoCommitInterval,
  getJjPathSetting,
  getNotePath,
  getUseJujutsu,
} from './config';
import { Commands as Cmd } from './contributions/commands';
import {
  Configurations as Conf,
  EXTENSION_ID,
} from './contributions/configurations';
import { NotesTreeProvider } from './notes-tree-provider';
import {
  JJ_PARENT_SCHEME,
  JjParentContentProvider,
} from './utils/jj-content-provider';
import { initJjPath, isJjAvailable } from './utils/jj-resolver';

/** Syncs the `jjEnabled` context key used by `when` clauses in package.json. */
function setJjContext(enabled: boolean): void {
  vscode.commands.executeCommand('setContext', Cmd.JjEnabled, enabled);
}

/** Syncs the `notesPathConfigured` context key used by viewsWelcome. */
function setNotePathContext(): void {
  vscode.commands.executeCommand(
    'setContext',
    Cmd.NotesPathConfigured,
    !!getNotePath(),
  );
}

async function showJjUnavailableNotification(): Promise<void> {
  const openSettings = 'Open Jujutsu Settings';
  const disableJj = 'Disable Jujutsu';
  const picked = await vscode.window.showWarningMessage(
    'Notes: jj is not available. Jujutsu features are disabled until jj is found.',
    openSettings,
    disableJj,
  );

  if (picked === openSettings) {
    await vscode.commands.executeCommand(
      'workbench.action.openSettings',
      '@ext:yuyosy.vscode-grove-notes grove-notes.versionControl.jjPath',
    );
    return;
  }

  if (picked === disableJj) {
    await vscode.workspace
      .getConfiguration(EXTENSION_ID)
      .update(
        'versionControl.useJujutsu',
        false,
        vscode.ConfigurationTarget.Global,
      );
  }
}

export function activate(context: vscode.ExtensionContext) {
  // --- jj initialisation ---
  const useJj = getUseJujutsu();
  if (useJj) {
    initJjPath(getJjPathSetting());
    if (!isJjAvailable()) {
      void showJjUnavailableNotification();
    }
  }
  const jjEnabled = useJj && isJjAvailable();
  setJjContext(jjEnabled);
  setNotePathContext();

  // Check existing notes folder for jj repo on startup
  if (jjEnabled) {
    const notePath = getNotePath();
    if (notePath) {
      maybeInitJj(notePath);
    }
  }

  const treeProvider = new NotesTreeProvider();

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      JJ_PARENT_SCHEME,
      new JjParentContentProvider(),
    ),

    vscode.window.registerTreeDataProvider('notesView', treeProvider),

    vscode.commands.registerCommand(Cmd.Setup, async () => {
      await setupNotes();
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand(Cmd.SelectNotesFolder, async () => {
      await selectNotesFolder();
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand(Cmd.NewNote, () => newNote()),
    vscode.commands.registerCommand(Cmd.ListNotes, listNotes),
    vscode.commands.registerCommand(Cmd.ListTags, listTags),

    vscode.commands.registerCommand(Cmd.Refresh, () => treeProvider.refresh()),

    vscode.commands.registerCommand(Cmd.JjDescribe, jjDescribe),
    vscode.commands.registerCommand(Cmd.JjNew, async () => {
      await jjNew();
      treeProvider.refresh();
    }),
    vscode.commands.registerCommand(Cmd.JjUndo, async () => {
      await jjUndo();
      treeProvider.refresh();
    }),
    vscode.commands.registerCommand(Cmd.JjRedo, async () => {
      await jjRedo();
      treeProvider.refresh();
    }),
    vscode.commands.registerCommand(Cmd.JjPush, jjPush),
    vscode.commands.registerCommand(Cmd.JjFetch, jjFetch),

    vscode.commands.registerCommand(Cmd.OpenGitignore, openGitignore),

    // view/title toolbar
    vscode.commands.registerCommand(Cmd.NewNoteInNotesView, () => newNote()),
    vscode.commands.registerCommand(Cmd.RefreshInNotesView, () =>
      treeProvider.refresh(),
    ),
    vscode.commands.registerCommand(Cmd.JjDescribeInNotesView, jjDescribe),
    vscode.commands.registerCommand(Cmd.JjNewInNotesView, async () => {
      await jjNew();
      treeProvider.refresh();
    }),
    vscode.commands.registerCommand(Cmd.JjUndoInNotesView, async () => {
      await jjUndo();
      treeProvider.refresh();
    }),
    vscode.commands.registerCommand(Cmd.JjRedoInNotesView, async () => {
      await jjRedo();
      treeProvider.refresh();
    }),

    // view/item/context menu (#notesView variants)
    vscode.commands.registerCommand(
      Cmd.EditTagsInNotesView,
      async (item: { data: { filePath?: string } }) => {
        await editTags(item?.data?.filePath ?? '');
        treeProvider.refresh();
      },
    ),
    vscode.commands.registerCommand(
      Cmd.RenameItemInNotesView,
      async (item: { data: { filePath?: string } }) => {
        await renameItem(item?.data?.filePath ?? '');
        treeProvider.refresh();
      },
    ),
    vscode.commands.registerCommand(
      Cmd.DeleteItemInNotesView,
      async (item: { data: { filePath?: string } }) => {
        await deleteItem(item?.data?.filePath ?? '');
        treeProvider.refresh();
      },
    ),
    vscode.commands.registerCommand(
      Cmd.NewNoteInFolderInNotesView,
      (item: { data: { filePath?: string } }) =>
        newNote(item?.data?.filePath ?? undefined),
    ),
    vscode.commands.registerCommand(
      Cmd.RevealInExplorerInNotesView,
      revealInExplorer,
    ),
    vscode.commands.registerCommand(Cmd.CopyPathInNotesView, copyPath),
    vscode.commands.registerCommand(
      Cmd.ViewDiffInNotesView,
      (item: { data: { filePath?: string } }) =>
        viewDiff(item?.data?.filePath ?? ''),
    ),
    vscode.commands.registerCommand(Cmd.OpenPreviewInNotesView, openPreview),
  );

  // Watch notes folder for file changes so the diff inline button stays in sync
  let fsWatcher: vscode.FileSystemWatcher | undefined;
  const startFsWatcher = (np: string) => {
    fsWatcher?.dispose();
    fsWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(np, '**'),
    );
    const refresh = (uri: vscode.Uri) => {
      // Ignore internal vcs metadata to avoid unnecessary refreshes
      const fp = uri.fsPath;
      if (
        !fp.startsWith(path.join(np, '.jj')) &&
        !fp.startsWith(path.join(np, '.git'))
      ) {
        treeProvider.refresh();
      }
    };
    fsWatcher.onDidCreate(refresh, null, context.subscriptions);
    fsWatcher.onDidChange(refresh, null, context.subscriptions);
    fsWatcher.onDidDelete(refresh, null, context.subscriptions);
    context.subscriptions.push(fsWatcher);
  };
  if (jjEnabled) {
    const np = getNotePath();
    if (np) startFsWatcher(np);
  }

  // Auto-commit timer
  const interval = getAutoCommitInterval();
  if (interval > 0) {
    context.subscriptions.push(
      startAutoCommit(interval, () => treeProvider.refresh()),
    );
  }

  // Re-register auto-commit when config changes
  let autoCommitDisposable: vscode.Disposable | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration(Conf.VersionControlUseJujutsu) ||
        e.affectsConfiguration(Conf.VersionControlJjPath) ||
        e.affectsConfiguration(Conf.NotePath)
      ) {
        initJjPath(getJjPathSetting());

        // Re-evaluate jj context key
        const nowUseJj = getUseJujutsu();
        const nowJjEnabled = nowUseJj && isJjAvailable();
        setJjContext(nowJjEnabled);

        if (
          nowUseJj &&
          !isJjAvailable() &&
          (e.affectsConfiguration(Conf.VersionControlUseJujutsu) ||
            e.affectsConfiguration(Conf.VersionControlJjPath))
        ) {
          void showJjUnavailableNotification();
        }

        // Check for jj init when notePath changes
        if (e.affectsConfiguration(Conf.NotePath)) {
          const notePath = getNotePath();
          if (nowJjEnabled && notePath) {
            maybeInitJj(notePath);
            startFsWatcher(notePath);
          } else {
            fsWatcher?.dispose();
            fsWatcher = undefined;
          }
        }
      }
      if (
        e.affectsConfiguration(Conf.VersionControlAutoCommitInterval) ||
        e.affectsConfiguration(Conf.NotePath)
      ) {
        autoCommitDisposable?.dispose();
        autoCommitDisposable = undefined;
        const newInterval = getAutoCommitInterval();
        if (newInterval > 0) {
          autoCommitDisposable = startAutoCommit(newInterval, () =>
            treeProvider.refresh(),
          );
          context.subscriptions.push(autoCommitDisposable);
        }
      }
      if (e.affectsConfiguration(EXTENSION_ID)) {
        setNotePathContext();
        treeProvider.refresh();
      }
    }),
  );
}

export function deactivate() {}
