import * as vscode from 'vscode';
import {
  jjDescribe,
  jjFetch,
  jjNew,
  jjPush,
  startAutoCommit,
} from './commands/jj-operations';
import { listNotes } from './commands/list-notes';
import { listTags } from './commands/list-tags';
import { newNote } from './commands/new-note';
import { setupNotes } from './commands/setup';
import { getAutoCommitInterval } from './config';
import { NotesTreeProvider } from './notes-tree-provider';

export function activate(context: vscode.ExtensionContext) {
  const treeProvider = new NotesTreeProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('notesView', treeProvider),

    vscode.commands.registerCommand('notes.setup', async () => {
      await setupNotes();
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('notes.newNote', newNote),
    vscode.commands.registerCommand('notes.listNotes', listNotes),
    vscode.commands.registerCommand('notes.listTags', listTags),

    vscode.commands.registerCommand('notes.refresh', () =>
      treeProvider.refresh(),
    ),

    vscode.commands.registerCommand('notes.jjDescribe', jjDescribe),
    vscode.commands.registerCommand('notes.jjNew', jjNew),
    vscode.commands.registerCommand('notes.jjPush', jjPush),
    vscode.commands.registerCommand('notes.jjFetch', jjFetch),
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
        e.affectsConfiguration('notes.autoCommitInterval') ||
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
        treeProvider.refresh();
      }
    }),
  );
}

export function deactivate() {}
