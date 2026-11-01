import * as vscode from 'vscode';
import { HelperDiagnosticsProvider } from './diagnosticsProvider';
import { getMsg } from './i18n';

export class HelperCodeActionProvider implements vscode.CodeActionProvider {
  private diagnosticsProvider: HelperDiagnosticsProvider;

  constructor(diagnosticsProvider: HelperDiagnosticsProvider) {
    this.diagnosticsProvider = diagnosticsProvider;
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const config = vscode.workspace.getConfiguration('vscodeHelper');
    if (!config.get<boolean>('enable', true)) {
      return [];
    }

    const actions: vscode.CodeAction[] = [];
    const issues = this.diagnosticsProvider.getIssuesForDocument(document);
    const msg = getMsg();

    for (const issue of issues) {
      const issueRange = new vscode.Range(issue.line, issue.col, issue.endLine, issue.endCol);
      if (!range.intersection(issueRange)) continue;

      // 1. Auto-fix action
      if (issue.fix) {
        const fixAction = new vscode.CodeAction(
          msg.actionFix(issue.code),
          vscode.CodeActionKind.QuickFix
        );
        fixAction.edit = new vscode.WorkspaceEdit();
        const lineRange = document.lineAt(issue.line).range;
        fixAction.edit.replace(document.uri, lineRange, issue.fix);
        fixAction.diagnostics = context.diagnostics.filter(
          (d) => d.code === issue.code && d.range.start.line === issue.line
        );
        fixAction.isPreferred = true;
        actions.push(fixAction);
      }

      // 2. Ignore / Suppress comment action
      const commentPrefix = document.languageId === 'python' ? '# ' : '// ';
      const suppressAction = new vscode.CodeAction(
        msg.actionIgnoreLine(issue.code),
        vscode.CodeActionKind.QuickFix
      );
      suppressAction.edit = new vscode.WorkspaceEdit();
      const line = document.lineAt(issue.line);
      const updatedText = `${line.text} ${commentPrefix}vscode-helper-disable-line ${issue.code}`;
      suppressAction.edit.replace(document.uri, line.range, updatedText);
      actions.push(suppressAction);

      // 3. Explanation action
      if (issue.suggestion) {
        const infoAction = new vscode.CodeAction(
          msg.actionExplain(issue.code),
          vscode.CodeActionKind.Empty
        );
        infoAction.command = {
          command: 'vscode-helper.explainRule',
          title: `Explain ${issue.code}`,
          arguments: [issue]
        };
        actions.push(infoAction);
      }
    }

    // 4. "Fix All" action
    const fixableCount = issues.filter((i) => i.fix).length;
    if (fixableCount > 0) {
      const fixAll = new vscode.CodeAction(
        msg.actionFixAll(fixableCount),
        vscode.CodeActionKind.SourceFixAll
      );
      fixAll.command = {
        command: 'vscode-helper.fixAll',
        title: 'Fix all issues'
      };
      actions.push(fixAll);
    }

    return actions;
  }
}
