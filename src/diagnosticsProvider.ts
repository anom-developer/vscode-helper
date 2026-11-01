import * as vscode from 'vscode';
import { analyzeDocument, CodeIssue } from './rules';
import { getMsg, replaceCyrillicHomoglyphs } from './i18n';

export class HelperDiagnosticsProvider {
  private collection: vscode.DiagnosticCollection;

  constructor(collection: vscode.DiagnosticCollection) {
    this.collection = collection;
  }

  getDiagnosticSeverityFromConfig(): vscode.DiagnosticSeverity {
    const config = vscode.workspace.getConfiguration('vscodeHelper');
    const severityStr = config.get<string>('severity', 'hint');
    switch (severityStr) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'information':
        return vscode.DiagnosticSeverity.Information;
      case 'hint':
      default:
        return vscode.DiagnosticSeverity.Hint;
    }
  }

  getIssuesForDocument(document: vscode.TextDocument): CodeIssue[] {
    const config = vscode.workspace.getConfiguration('vscodeHelper');
    const disabledRules = config.get<string[]>('disabledRules', []);
    const maxLineLength = config.get<number>('maxLineLength', 120);
    const minSeverity = this.getDiagnosticSeverityFromConfig();

    return analyzeDocument(document, {
      minSeverity,
      disabledRules,
      maxLineLength
    });
  }

  analyze(document: vscode.TextDocument): CodeIssue[] {
    if (!this.isSupportedDocument(document)) {
      this.collection.delete(document.uri);
      return [];
    }

    const config = vscode.workspace.getConfiguration('vscodeHelper');
    if (!config.get<boolean>('enable', true)) {
      this.collection.delete(document.uri);
      return [];
    }

    const issues = this.getIssuesForDocument(document);
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
            `💡 ${issue.suggestion}`
          )
        ];
      }
      return diag;
    });

    this.collection.set(document.uri, diagnostics);
    return issues;
  }

  async fixAll(editor: vscode.TextEditor): Promise<number> {
    const document = editor.document;
    const issues = this.getIssuesForDocument(document);
    const fixable = issues.filter((i) => i.fix !== undefined);

    if (fixable.length === 0) {
      vscode.window.showInformationMessage(getMsg().noFixableIssues);
      return 0;
    }

    // Group fixes by line and apply sequentially
    const lineIssuesMap = new Map<number, CodeIssue[]>();
    for (const issue of fixable) {
      const list = lineIssuesMap.get(issue.line) ?? [];
      list.push(issue);
      lineIssuesMap.set(issue.line, list);
    }

    const lineFixMap = new Map<number, string>();
    for (const [lineNum, issuesForLine] of lineIssuesMap.entries()) {
      let currentText = document.lineAt(lineNum).text;
      for (const issue of issuesForLine) {
        if (issue.code === 'cyrillic-in-code') {
          currentText = replaceCyrillicHomoglyphs(currentText);
        } else if (issue.code === 'trailing-whitespace') {
          currentText = currentText.trimEnd();
        } else if (issue.code === 'no-var') {
          currentText = currentText.replace(/\bvar\b/, 'const');
        } else if (issue.code === 'no-debugger') {
          currentText = currentText.replace(/\bdebugger\s*;?/, '').trimEnd();
        } else if (issue.code === 'eqeqeq') {
          currentText = currentText
            .replace(/([^=!<>])==(?!=)([^=])/g, '$1===$2')
            .replace(/([^=!<>])!=(?!=)([^=])/g, '$1!==$2');
        } else if (issue.code === 'py-bare-except') {
          currentText = currentText.replace(/except\s*:/, 'except Exception:');
        } else if (issue.code === 'py-none-compare') {
          currentText = currentText.replace(/==\s*None\b/g, 'is None').replace(/!=\s*None\b/g, 'is not None');
        } else if (issue.code === 'cpp-null') {
          currentText = currentText.replace(/\bNULL\b/g, 'nullptr');
        } else if (issue.fix) {
          currentText = issue.fix;
        }
      }
      lineFixMap.set(lineNum, currentText);
    }

    await editor.edit((editBuilder) => {
      // Process in reverse line order to prevent offset shift
      const lines = Array.from(lineFixMap.keys()).sort((a, b) => b - a);
      for (const lineNum of lines) {
        const line = document.lineAt(lineNum);
        const newText = lineFixMap.get(lineNum)!;
        editBuilder.replace(line.range, newText);
      }
    });

    this.analyze(document);
    return lineFixMap.size;
  }

  showSuggestions(document: vscode.TextDocument): void {
    const issues = this.getIssuesForDocument(document);
    if (issues.length === 0) {
      vscode.window.showInformationMessage(getMsg().noIssues);
      return;
    }

    const msg = getMsg();
    const items: (vscode.QuickPickItem & { issue: CodeIssue })[] = issues.map((i) => ({
      label: `${msg.linePrefix} ${i.line + 1}: ${i.message}`,
      description: i.code,
      detail: i.suggestion ? `💡 ${i.suggestion}` : undefined,
      issue: i
    }));

    vscode.window.showQuickPick(items, {
      placeHolder: getMsg().quickPickPlaceholder(issues.length),
      matchOnDescription: true,
      matchOnDetail: true
    }).then((selected) => {
      if (!selected) return;
      const pos = new vscode.Position(selected.issue.line, selected.issue.col);
      const range = new vscode.Range(pos, new vscode.Position(selected.issue.endLine, selected.issue.endCol));
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        editor.selection = new vscode.Selection(pos, pos);
      }
    });
  }

  clear(uri?: vscode.Uri): void {
    if (uri) {
      this.collection.delete(uri);
    } else {
      this.collection.clear();
    }
  }

  public isSupportedDocument(document: vscode.TextDocument): boolean {
    const supportedLanguages = [
      'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
      'python', 'java', 'cpp', 'c', 'go', 'rust',
      'json', 'html', 'css', 'markdown'
    ];
    const isSupportedScheme = document.uri.scheme === 'file' || document.uri.scheme === 'untitled';
    return isSupportedScheme && supportedLanguages.includes(document.languageId);
  }
}
