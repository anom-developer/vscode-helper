import * as vscode from 'vscode';
import { HelperDiagnosticsProvider } from './diagnosticsProvider';
import { HelperCodeActionProvider } from './codeActionProvider';
import { HelperHoverProvider } from './hoverProvider';
import { HelperCompletionProvider } from './completionProvider';
import { HelperDecorationProvider } from './decorationProvider';
import { CodeIssue } from './rules';
import { getMsg } from './i18n';

const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
  'python', 'java', 'cpp', 'c', 'go', 'rust',
  'json', 'html', 'css', 'markdown'
];

let typeDebounceTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('VSCode Helper');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('VSCode Helper (anom-developer) is now active!');

  const diagnosticCollection = vscode.languages.createDiagnosticCollection('vscode-helper');
  context.subscriptions.push(diagnosticCollection);

  const diagnosticsProvider = new HelperDiagnosticsProvider(diagnosticCollection);
  const decorationProvider = new HelperDecorationProvider(diagnosticsProvider);
  context.subscriptions.push({ dispose: () => decorationProvider.dispose() });

  // ─── Status Bar Item ──────────────────────────────────────────────────────────
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'vscode-helper.showSuggestions';
  context.subscriptions.push(statusBarItem);

  function updateStatusBar(editor?: vscode.TextEditor): void {
    const config = vscode.workspace.getConfiguration('vscodeHelper');
    const enabled = config.get<boolean>('enable', true);
    const showStatusBar = config.get<boolean>('showStatusBar', true);
    const msg = getMsg();

    if (!showStatusBar) {
      statusBarItem.hide();
      return;
    }

    if (!enabled) {
      statusBarItem.text = msg.statusOff;
      statusBarItem.tooltip = msg.statusTooltipOff;
      statusBarItem.show();
      return;
    }

    if (!editor || !diagnosticsProvider.isSupportedDocument(editor.document)) {
      statusBarItem.text = msg.statusOk;
      statusBarItem.tooltip = msg.statusTooltipOk;
      statusBarItem.show();
      return;
    }

    const issues = diagnosticsProvider.getIssuesForDocument(editor.document);
    if (issues.length === 0) {
      statusBarItem.text = msg.statusOk;
      statusBarItem.tooltip = msg.statusTooltipOk;
    } else {
      const errors = issues.filter((i) => i.severity === vscode.DiagnosticSeverity.Error).length;
      const warnings = issues.filter((i) => i.severity === vscode.DiagnosticSeverity.Warning).length;
      const fixable = issues.filter((i) => i.fix).length;

      if (errors > 0) {
        statusBarItem.text = msg.statusBarErrors(errors, warnings);
      } else {
        statusBarItem.text = msg.statusBarIssues(issues.length, fixable);
      }
      statusBarItem.tooltip = msg.statusTooltipIssues(issues.length, fixable);
    }
    statusBarItem.show();
  }

  // ─── Language Providers ─────────────────────────────────────────────────────
  const hoverProvider = new HelperHoverProvider(diagnosticsProvider);
  const codeActionProvider = new HelperCodeActionProvider(diagnosticsProvider);
  const completionProvider = new HelperCompletionProvider();

  for (const lang of SUPPORTED_LANGUAGES) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(lang, hoverProvider),
      vscode.languages.registerCodeActionsProvider(
        lang,
        codeActionProvider,
        {
          providedCodeActionKinds: [
            vscode.CodeActionKind.QuickFix,
            vscode.CodeActionKind.SourceFixAll
          ]
        }
      ),
      vscode.languages.registerCompletionItemProvider(
        lang,
        completionProvider,
        '.', '(', ' ', '@', '/'
      )
    );
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────────

  // On Save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const config = vscode.workspace.getConfiguration('vscodeHelper');
      if (config.get<boolean>('enable', true) && config.get<boolean>('analyzeOnSave', true)) {
        diagnosticsProvider.analyze(doc);
        if (vscode.window.activeTextEditor?.document === doc) {
          decorationProvider.decorate(vscode.window.activeTextEditor);
          updateStatusBar(vscode.window.activeTextEditor);
        }
      }
    })
  );

  // On Type (debounced to avoid performance lag)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const config = vscode.workspace.getConfiguration('vscodeHelper');
      if (config.get<boolean>('enable', true) && config.get<boolean>('analyzeOnType', false)) {
        if (typeDebounceTimer) {
          clearTimeout(typeDebounceTimer);
        }
        typeDebounceTimer = setTimeout(() => {
          diagnosticsProvider.analyze(e.document);
          if (vscode.window.activeTextEditor?.document === e.document) {
            decorationProvider.decorate(vscode.window.activeTextEditor);
            updateStatusBar(vscode.window.activeTextEditor);
          }
        }, 300);
      }
    })
  );

  // On Active Editor Change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        diagnosticsProvider.analyze(editor.document);
        decorationProvider.decorate(editor);
      }
      updateStatusBar(editor);
    })
  );

  // On Document Close
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticsProvider.clear(doc.uri);
    })
  );

  // On Configuration Change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('vscodeHelper')) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          diagnosticsProvider.analyze(editor.document);
          decorationProvider.decorate(editor);
        }
        updateStatusBar(editor);
      }
    })
  );

  // ─── Commands ───────────────────────────────────────────────────────────────

  context.subscriptions.push(
    // 1. Analyze Current File
    vscode.commands.registerCommand('vscode-helper.analyzeFile', () => {
      const msg = getMsg();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage(msg.noActiveEditor);
        return;
      }
      const issues = diagnosticsProvider.analyze(editor.document);
      decorationProvider.decorate(editor);
      updateStatusBar(editor);
      const fixable = issues.filter((i) => i.fix).length;
      vscode.window.showInformationMessage(msg.analysisComplete(issues.length, fixable));
    }),

    // 2. Fix All Issues
    vscode.commands.registerCommand('vscode-helper.fixAll', async () => {
      const msg = getMsg();
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const count = await diagnosticsProvider.fixAll(editor);
      decorationProvider.decorate(editor);
      updateStatusBar(editor);
      if (count > 0) {
        vscode.window.showInformationMessage(msg.fixedCount(count));
      }
    }),

    // 3. Show Suggestions (QuickPick)
    vscode.commands.registerCommand('vscode-helper.showSuggestions', () => {
      const msg = getMsg();
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        diagnosticsProvider.showSuggestions(editor.document);
      } else {
        vscode.window.showInformationMessage(msg.openFilePrompt);
      }
    }),

    // 4. Toggle Enable/Disable
    vscode.commands.registerCommand('vscode-helper.toggle', async () => {
      const msg = getMsg();
      const config = vscode.workspace.getConfiguration('vscodeHelper');
      const current = config.get<boolean>('enable', true);
      await config.update('enable', !current, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(msg.toggled(!current));
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        if (!current) {
          diagnosticsProvider.analyze(editor.document);
          decorationProvider.decorate(editor);
        } else {
          diagnosticsProvider.clear();
          decorationProvider.clear(editor);
        }
      }
      updateStatusBar(editor);
    }),

    // 5. Clear Diagnostics & Decorations
    vscode.commands.registerCommand('vscode-helper.clear', () => {
      const msg = getMsg();
      const editor = vscode.window.activeTextEditor;
      diagnosticsProvider.clear(editor?.document.uri);
      if (editor) {
        decorationProvider.clear(editor);
      }
      updateStatusBar(editor);
      vscode.window.showInformationMessage(msg.cleared);
    }),

    // 6. Show File Analysis Statistics
    vscode.commands.registerCommand('vscode-helper.showStats', () => {
      const msg = getMsg();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage(msg.openFilePrompt);
        return;
      }
      const issues = diagnosticsProvider.getIssuesForDocument(editor.document);
      const errors = issues.filter((i) => i.severity === vscode.DiagnosticSeverity.Error).length;
      const warnings = issues.filter((i) => i.severity === vscode.DiagnosticSeverity.Warning).length;
      const infos = issues.filter((i) => i.severity === vscode.DiagnosticSeverity.Information).length;
      const hints = issues.filter((i) => i.severity === vscode.DiagnosticSeverity.Hint).length;
      const fixable = issues.filter((i) => i.fix).length;
      const fileName = editor.document.fileName.split(/[\\/]/).pop() ?? 'File';

      vscode.window.showInformationMessage(
        `${msg.summaryTitle(fileName)}\n` +
        `${msg.summaryErrors} ${errors}\n` +
        `${msg.summaryWarnings} ${warnings}\n` +
        `${msg.summaryInfos} ${infos}\n` +
        `${msg.summaryHints} ${hints}\n` +
        `${msg.summaryFixable} ${fixable}`
      );
    }),

    // 7. Explain Rule (invoked from Code Action)
    vscode.commands.registerCommand('vscode-helper.explainRule', (issue: CodeIssue) => {
      const msg = getMsg();
      if (!issue) return;
      vscode.window.showInformationMessage(
        `💡 [${issue.code}] ${issue.message}\n\n${msg.recommendation} ${issue.suggestion ?? ''}`
      );
    })
  );

  // Initial trigger for open editor
  if (vscode.window.activeTextEditor) {
    diagnosticsProvider.analyze(vscode.window.activeTextEditor.document);
    decorationProvider.decorate(vscode.window.activeTextEditor);
  }
  updateStatusBar(vscode.window.activeTextEditor);
}

export function deactivate() {
  if (typeDebounceTimer) {
    clearTimeout(typeDebounceTimer);
  }
}
