import * as vscode from 'vscode';
import { analyzeDocument } from './rules';

export class HelperCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const issues = analyzeDocument(document);

    for (const issue of issues) {
      // Only show actions for issues that overlap with the current cursor/selection
      const issueRange = new vscode.Range(issue.line, issue.col, issue.endLine, issue.endCol);
      if (!range.intersection(issueRange)) continue;

      if (issue.fix) {
        const action = new vscode.CodeAction(
          `🔧 Fix: ${issue.code}`,
          vscode.CodeActionKind.QuickFix
        );
        action.edit = new vscode.WorkspaceEdit();
        const lineRange = document.lineAt(issue.line).range;
        action.edit.replace(document.uri, lineRange, issue.fix);
        action.diagnostics = context.diagnostics.filter(
          (d) => d.code === issue.code && d.range.start.line === issue.line
        );
        action.isPreferred = true;
        actions.push(action);
      }

      if (issue.suggestion) {
        const infoAction = new vscode.CodeAction(
          `💡 How to fix: ${issue.suggestion}`,
          vscode.CodeActionKind.Empty
        );
        infoAction.command = {
          command: 'vscode.open',
          title: 'Open docs',
          arguments: []
        };
        actions.push(infoAction);
      }
    }

    // "Fix All" action
    const fixableCount = issues.filter((i) => i.fix).length;
    if (fixableCount > 0) {
      const fixAll = new vscode.CodeAction(
        `🔧 Fix all ${fixableCount} auto-fixable issue(s)`,
        vscode.CodeActionKind.QuickFix
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
