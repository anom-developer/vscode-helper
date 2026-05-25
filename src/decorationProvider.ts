import * as vscode from 'vscode';
import { analyzeDocument } from './rules';

const errorDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: { id: 'vscodeHelper.errorBackground' },
  border: '1px solid',
  borderColor: new vscode.ThemeColor('editorError.foreground'),
  borderRadius: '2px',
  overviewRulerColor: new vscode.ThemeColor('editorError.foreground'),
  overviewRulerLane: vscode.OverviewRulerLane.Right,
});

const warningDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: { id: 'vscodeHelper.warningBackground' },
  border: '1px dashed',
  borderColor: new vscode.ThemeColor('editorWarning.foreground'),
  borderRadius: '2px',
  overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
  overviewRulerLane: vscode.OverviewRulerLane.Right,
});

const hintDecorationType = vscode.window.createTextEditorDecorationType({
  textDecoration: 'underline dotted',
  overviewRulerColor: new vscode.ThemeColor('editorHint.foreground'),
  overviewRulerLane: vscode.OverviewRulerLane.Left,
});

export class HelperDecorationProvider {
  decorate(editor: vscode.TextEditor | undefined): void {
    if (!editor) return;

    const document = editor.document;
    const issues = analyzeDocument(document);

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

    editor.setDecorations(errorDecorationType, errors);
    editor.setDecorations(warningDecorationType, warnings);
    editor.setDecorations(hintDecorationType, hints);
  }
}
