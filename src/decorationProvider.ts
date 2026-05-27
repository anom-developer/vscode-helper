import * as vscode from 'vscode';
import { analyzeDocument } from './rules';

// ⚠️ BUG FIX: decoration types must NOT be created at module load time (before
// the VS Code API is fully initialised). Creating them lazily inside the class
// prevents "Cannot read properties of undefined" crashes during extension host
// startup and in unit-test environments that don't activate a full window.
let errorDecorationType: vscode.TextEditorDecorationType | undefined;
let warningDecorationType: vscode.TextEditorDecorationType | undefined;
let hintDecorationType: vscode.TextEditorDecorationType | undefined;

function getDecorationTypes(): {
  error: vscode.TextEditorDecorationType;
  warning: vscode.TextEditorDecorationType;
  hint: vscode.TextEditorDecorationType;
} {
  if (!errorDecorationType) {
    errorDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: { id: 'vscodeHelper.errorBackground' },
      border: '1px solid',
      borderColor: new vscode.ThemeColor('editorError.foreground'),
      borderRadius: '2px',
      overviewRulerColor: new vscode.ThemeColor('editorError.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
  }
  if (!warningDecorationType) {
    warningDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: { id: 'vscodeHelper.warningBackground' },
      border: '1px dashed',
      borderColor: new vscode.ThemeColor('editorWarning.foreground'),
      borderRadius: '2px',
      overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
  }
  if (!hintDecorationType) {
    hintDecorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: 'underline dotted',
      overviewRulerColor: new vscode.ThemeColor('editorHint.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Left,
    });
  }
  return { error: errorDecorationType, warning: warningDecorationType, hint: hintDecorationType };
}

export class HelperDecorationProvider {
  decorate(editor: vscode.TextEditor | undefined): void {
    if (!editor) return;

    const document = editor.document;
    const issues = analyzeDocument(document);
    const { error, warning, hint } = getDecorationTypes();

    const errors: vscode.DecorationOptions[] = [];
    const warnings: vscode.DecorationOptions[] = [];
    const hints: vscode.DecorationOptions[] = [];

    for (const issue of issues) {
      const range = new vscode.Range(issue.line, issue.col, issue.endLine, issue.endCol);
      const decoration: vscode.DecorationOptions = {
        range,
        hoverMessage: new vscode.MarkdownString(
          `**${issue.message}**${issue.suggestion ? `\n\n> 💡 ${issue.suggestion}` : ''}`
        )
      };

      switch (issue.severity) {
        case vscode.DiagnosticSeverity.Error:
          errors.push(decoration);
          break;
        case vscode.DiagnosticSeverity.Warning:
          warnings.push(decoration);
          break;
        default:
          hints.push(decoration);
      }
    }

    editor.setDecorations(error, errors);
    editor.setDecorations(warning, warnings);
    editor.setDecorations(hint, hints);
  }
}
