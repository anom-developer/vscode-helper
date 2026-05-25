import * as vscode from 'vscode';
import { analyzeDocument } from './rules';

export class HelperDiagnosticsProvider {
  private collection: vscode.DiagnosticCollection;

  constructor(collection: vscode.DiagnosticCollection) {
    this.collection = collection;
  }

  analyze(document: vscode.TextDocument): void {
    if (!this.isSupportedDocument(document)) {
      return;
    }

    const issues = analyzeDocument(document);
    const diagnostics: vscode.Diagnostic[] = issues.map((issue) => {
      const range = new vscode.Range(
        issue.line, issue.col,
        issue.endLine, issue.endCol
      );
      const diag = new vscode.Diagnostic(range, issue.message, issue.severity);
      diag.source = 'VSCode Helper';
      diag.code = issue.code;
      if (issue.suggestion) {
        diag.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(document.uri, range),
            `💡 Fix: ${issue.suggestion}`
          )
        ];
      }
      return diag;
    });

    this.collection.set(document.uri, diagnostics);
  }

  async fixAll(editor: vscode.TextEditor): Promise<void> {
    const document = editor.document;
    const issues = analyzeDocument(document);
    const fixable = issues.filter((i) => i.fix !== undefined);

    if (fixable.length === 0) {
      vscode.window.showInformationMessage('VSCode Helper: No auto-fixable issues found.');
      return;
    }

    await editor.edit((editBuilder) => {
      // Process in reverse line order to avoid offset drift
      const sorted = [...fixable].sort((a, b) => b.line - a.line);
      for (const issue of sorted) {
        const line = document.lineAt(issue.line);
        editBuilder.replace(line.range, issue.fix!);
      }
    });

    this.analyze(document);
  }

  showSuggestions(document: vscode.TextDocument): void {
    const issues = analyzeDocument(document);
    if (issues.length === 0) {
      vscode.window.showInformationMessage('✅ VSCode Helper: No issues found!');
      return;
    }

    const items: vscode.QuickPickItem[] = issues.map((i) => ({
      label: `Line ${i.line + 1}: ${i.message}`,
      description: i.suggestion ?? '',
      detail: i.fix ? `Auto-fix available` : undefined
    }));

    vscode.window.showQuickPick(items, {
      placeHolder: `${issues.length} issue(s) found — select to navigate`,
      canPickMany: false
    }).then((selected) => {
      if (!selected) return;
      const lineNum = parseInt(selected.label.split(':')[0].replace('Line ', '')) - 1;
      const pos = new vscode.Position(lineNum, 0);
      const range = new vscode.Range(pos, pos);
      vscode.window.activeTextEditor?.revealRange(range, vscode.TextEditorRevealType.InCenter);
      if (vscode.window.activeTextEditor) {
        vscode.window.activeTextEditor.selection = new vscode.Selection(pos, pos);
      }
    });
  }

  private isSupportedDocument(document: vscode.TextDocument): boolean {
    const supported = [
      'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
      'python', 'java', 'cpp', 'c', 'go', 'rust'
    ];
    return supported.includes(document.languageId) && document.uri.scheme === 'file';
  }
}
