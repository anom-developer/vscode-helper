import * as vscode from 'vscode';
import { HelperDiagnosticsProvider } from './diagnosticsProvider';

let errorDecorationType: vscode.TextEditorDecorationType | undefined;
let warningDecorationType: vscode.TextEditorDecorationType | undefined;
let infoDecorationType: vscode.TextEditorDecorationType | undefined;
let hintDecorationType: vscode.TextEditorDecorationType | undefined;

function getDecorationTypes(): {
  error: vscode.TextEditorDecorationType;
  warning: vscode.TextEditorDecorationType;
  info: vscode.TextEditorDecorationType;
  hint: vscode.TextEditorDecorationType;
} {
  if (!errorDecorationType) {
    errorDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: new vscode.ThemeColor('vscodeHelper.errorBackground'),
      border: '1px solid',
      borderColor: new vscode.ThemeColor('editorError.foreground'),
      borderRadius: '2px',
      overviewRulerColor: new vscode.ThemeColor('editorError.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
  }
  if (!warningDecorationType) {
    warningDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: new vscode.ThemeColor('vscodeHelper.warningBackground'),
      border: '1px dashed',
      borderColor: new vscode.ThemeColor('editorWarning.foreground'),
      borderRadius: '2px',
      overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
  }
  if (!infoDecorationType) {
    infoDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: new vscode.ThemeColor('vscodeHelper.infoBackground'),
      border: '1px dotted',
      borderColor: new vscode.ThemeColor('editorInfo.foreground'),
      borderRadius: '2px',
      overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Center,
    });
  }
  if (!hintDecorationType) {
    hintDecorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: 'underline dotted',
      overviewRulerColor: new vscode.ThemeColor('editorHint.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Left,
    });
  }
  return {
    error: errorDecorationType,
    warning: warningDecorationType,
    info: infoDecorationType,
    hint: hintDecorationType
  };
}

export class HelperDecorationProvider {
  private diagnosticsProvider: HelperDiagnosticsProvider;

  constructor(diagnosticsProvider: HelperDiagnosticsProvider) {
    this.diagnosticsProvider = diagnosticsProvider;
  }

  decorate(editor: vscode.TextEditor | undefined): void {
    if (!editor) return;

    const config = vscode.workspace.getConfiguration('vscodeHelper');
    const enabled = config.get<boolean>('enable', true);
    const showDecorations = config.get<boolean>('showDecorations', true);

    if (!enabled || !showDecorations || !this.diagnosticsProvider.isSupportedDocument(editor.document)) {
      this.clear(editor);
      return;
    }

    const issues = this.diagnosticsProvider.getIssuesForDocument(editor.document);
    const { error, warning, info, hint } = getDecorationTypes();

    const errors: vscode.DecorationOptions[] = [];
    const warnings: vscode.DecorationOptions[] = [];
    const infos: vscode.DecorationOptions[] = [];
    const hints: vscode.DecorationOptions[] = [];

    for (const issue of issues) {
      if (issue.line >= editor.document.lineCount) continue;
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
        case vscode.DiagnosticSeverity.Information:
          infos.push(decoration);
          break;
        case vscode.DiagnosticSeverity.Hint:
        default:
          hints.push(decoration);
          break;
      }
    }

    editor.setDecorations(error, errors);
    editor.setDecorations(warning, warnings);
    editor.setDecorations(info, infos);
    editor.setDecorations(hint, hints);
  }

  clear(editor?: vscode.TextEditor): void {
    if (!editor) return;
    const { error, warning, info, hint } = getDecorationTypes();
    editor.setDecorations(error, []);
    editor.setDecorations(warning, []);
    editor.setDecorations(info, []);
    editor.setDecorations(hint, []);
  }

  dispose(): void {
    errorDecorationType?.dispose();
    warningDecorationType?.dispose();
    infoDecorationType?.dispose();
    hintDecorationType?.dispose();
    errorDecorationType = undefined;
    warningDecorationType = undefined;
    infoDecorationType = undefined;
    hintDecorationType = undefined;
  }
}
