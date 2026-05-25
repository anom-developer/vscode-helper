import * as vscode from 'vscode';
import { HelperDiagnosticsProvider } from './diagnosticsProvider';
import { HelperCodeActionProvider } from './codeActionProvider';
import { HelperHoverProvider } from './hoverProvider';
import { HelperCompletionProvider } from './completionProvider';
import { HelperDecorationProvider } from './decorationProvider';

const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python',
  'java', 'cpp', 'c', 'go', 'rust'
];

export function activate(context: vscode.ExtensionContext) {
  console.log('VSCode Helper is now active!');

  const diagnosticCollection = vscode.languages.createDiagnosticCollection('vscode-helper');
  context.subscriptions.push(diagnosticCollection);

  const diagnosticsProvider = new HelperDiagnosticsProvider(diagnosticCollection);
  const decorationProvider = new HelperDecorationProvider();

  // Register hover provider (shows tips on hover)
  for (const lang of SUPPORTED_LANGUAGES) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(lang, new HelperHoverProvider()),
      vscode.languages.registerCodeActionsProvider(
        lang,
        new HelperCodeActionProvider(),
        { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
      ),
      vscode.languages.registerCompletionItemProvider(
        lang,
        new HelperCompletionProvider(),
        '.', '(', ' '
      )
    );
  }

  // Analyze on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const config = vscode.workspace.getConfiguration('vscodeHelper');
      if (config.get('enable') && config.get('analyzeOnSave')) {
        diagnosticsProvider.analyze(doc);
        decorationProvider.decorate(vscode.window.activeTextEditor);
      }
    })
  );

  // Analyze on type (optional)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const config = vscode.workspace.getConfiguration('vscodeHelper');
      if (config.get('enable') && config.get('analyzeOnType')) {
        diagnosticsProvider.analyze(e.document);
      }
    })
  );

  // Analyze when switching editor
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        diagnosticsProvider.analyze(editor.document);
        decorationProvider.decorate(editor);
      }
    })
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-helper.analyzeFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        diagnosticsProvider.analyze(editor.document);
        decorationProvider.decorate(editor);
        vscode.window.showInformationMessage('VSCode Helper: Analysis complete!');
      }
    }),

    vscode.commands.registerCommand('vscode-helper.fixAll', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      await diagnosticsProvider.fixAll(editor);
      vscode.window.showInformationMessage('VSCode Helper: All auto-fixable issues resolved!');
    }),

    vscode.commands.registerCommand('vscode-helper.showSuggestions', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        diagnosticsProvider.showSuggestions(editor.document);
      }
    })
  );

  // Analyze currently open file on activation
  if (vscode.window.activeTextEditor) {
    diagnosticsProvider.analyze(vscode.window.activeTextEditor.document);
    decorationProvider.decorate(vscode.window.activeTextEditor);
  }
}

export function deactivate() {}
