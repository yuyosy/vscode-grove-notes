import * as path from 'node:path';
import * as vscode from 'vscode';
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
import { renameItem } from './commands/rename-item';
import { maybeInitJj, selectNotesFolder, setupNotes } from './commands/setup';
import { viewDiff } from './commands/view-diff';
import {
  getAutoCommitInterval,
  getNotePath,
  getPreviewOpenToSide,
  getUseJujutsu,
} from './config';
import { NotesTreeProvider } from './notes-tree-provider';
import {
  JJ_PARENT_SCHEME,
  JjParentContentProvider,
} from './utils/jj-content-provider';
import { initJjPath, isJjAvailable, jjSource } from './utils/jj-resolver';

/** Syncs the `notes.jjEnabled` context key used by `when` clauses in package.json. */
function setJjContext(enabled: boolean): void {
  vscode.commands.executeCommand('setContext', 'notes.jjEnabled', enabled);
}

/** Syncs the `notes.notesPathConfigured` context key used by viewsWelcome. */
function setNotePathContext(): void {
  vscode.commands.executeCommand(
    'setContext',
    'notes.notesPathConfigured',
    !!getNotePath(),
  );
}

export function activate(context: vscode.ExtensionContext) {
  // --- jj initialisation ---
  const useJj = getUseJujutsu();
  if (useJj) {
    initJjPath(context.extensionPath);
    if (!isJjAvailable()) {
      vscode.window.showWarningMessage(
        'Notes: jj binary not found. Jujutsu features will be unavailable. Install jj or place a bundled binary at resources/bin/<platform>/jj[.exe].',
      );
    } else {
      const src = jjSource(context.extensionPath);
      if (src === 'bundled') {
        vscode.window.showInformationMessage('Notes: Using bundled jj binary.');
      }
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

    vscode.commands.registerCommand('notes.setup', async () => {
      await setupNotes();
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('notes.selectNotesFolder', async () => {
      await selectNotesFolder();
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('notes.newNote', newNote),
    vscode.commands.registerCommand(
      'notes.newNoteInFolder',
      (item: { data: { filePath?: string } }) =>
        newNote(item?.data?.filePath ?? undefined),
    ),
    vscode.commands.registerCommand('notes.listNotes', listNotes),
    vscode.commands.registerCommand('notes.listTags', listTags),

    vscode.commands.registerCommand('notes.refresh', () =>
      treeProvider.refresh(),
    ),

    vscode.commands.registerCommand('notes.jjDescribe', jjDescribe),
    vscode.commands.registerCommand('notes.jjNew', jjNew),
    vscode.commands.registerCommand('notes.jjUndo', jjUndo),
    vscode.commands.registerCommand('notes.jjRedo', jjRedo),
    vscode.commands.registerCommand('notes.jjPush', jjPush),
    vscode.commands.registerCommand('notes.jjFetch', jjFetch),

    vscode.commands.registerCommand(
      'notes.editTags',
      (item: { data: { filePath?: string } }) =>
        editTags(item?.data?.filePath ?? ''),
    ),
    vscode.commands.registerCommand(
      'notes.renameItem',
      (item: { data: { filePath?: string } }) =>
        renameItem(item?.data?.filePath ?? ''),
    ),
    vscode.commands.registerCommand(
      'notes.deleteItem',
      (item: { data: { filePath?: string } }) =>
        deleteItem(item?.data?.filePath ?? ''),
    ),
    vscode.commands.registerCommand(
      'notes.viewDiff',
      (item: { data: { filePath?: string } }) =>
        viewDiff(item?.data?.filePath ?? ''),
    ),
    vscode.commands.registerCommand(
      'notes.revealInExplorer',
      (item: { data: { filePath?: string } }) => {
        const fp = item?.data?.filePath;
        if (fp) {
          vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(fp));
        }
      },
    ),
    vscode.commands.registerCommand(
      'notes.copyPath',
      (item: { data: { filePath?: string } }) => {
        const fp = item?.data?.filePath;
        if (!fp) return;
        const sep = vscode.workspace
          .getConfiguration('explorer')
          .get<string>('copyPathSeparator', path.sep);
        const normalized =
          sep === '/' ? fp.replace(/\\/g, '/') : fp.replace(/\//g, '\\');
        vscode.env.clipboard.writeText(normalized);
      },
    ),

    vscode.commands.registerCommand(
      'notes.openPreview',
      (item: { data: { filePath?: string } }) => {
        const fp = item?.data?.filePath;
        if (fp) {
          const cmd = getPreviewOpenToSide()
            ? 'markdown.showPreviewToSide'
            : 'markdown.showPreview';
          vscode.commands.executeCommand(cmd, vscode.Uri.file(fp));
        }
      },
    ),

    vscode.commands.registerCommand('notes.openGitignore', openGitignore),
  );

  // Auto-commit timer
  const interval = getAutoCommitInterval();
  if (interval > 0) {
    context.subscriptions.push(startAutoCommit(interval));
  }

  // Re-register auto-commit when config changes
  let autoCommitDisposable: vscode.Disposable | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('notes.versionControl.useJujutsu') ||
        e.affectsConfiguration('notes.notePath')
      ) {
        // Re-evaluate jj context key
        const nowUseJj = getUseJujutsu();
        const nowJjEnabled = nowUseJj && isJjAvailable();
        setJjContext(nowJjEnabled);

        // Check for jj init when notePath changes
        if (nowJjEnabled && e.affectsConfiguration('notes.notePath')) {
          const notePath = getNotePath();
          if (notePath) maybeInitJj(notePath);
        }
      }
      if (
        e.affectsConfiguration('notes.versionControl.autoCommitInterval') ||
        e.affectsConfiguration('notes.notePath')
      ) {
        autoCommitDisposable?.dispose();
        autoCommitDisposable = undefined;
        const newInterval = getAutoCommitInterval();
        if (newInterval > 0) {
          autoCommitDisposable = startAutoCommit(newInterval);
          context.subscriptions.push(autoCommitDisposable);
        }
      }
      if (e.affectsConfiguration('notes')) {
        setNotePathContext();
        treeProvider.refresh();
      }
    }),
  );
}

export function deactivate() {}
