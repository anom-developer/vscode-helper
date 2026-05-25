import * as vscode from 'vscode';
import { analyzeDocument } from './rules';

const HOVER_DOCS: Record<string, string> = {
  'var': '**`var` is function-scoped** and hoisted to the top of its function. This can cause subtle bugs. Prefer `const` for values that never change, `let` for values that do.',
  'eval': '**`eval()` executes a string as code** — this is a major security risk (XSS, injection) and also prevents JavaScript engine optimisations.',
  'console.log': '**Debug output** — fine during development, but should be removed or replaced with a logger library before production deployment.',
  '==': '**Loose equality `==`** performs type coercion, leading to surprising results like `0 == ""` being `true`. Use `===` for predictable comparisons.',
  'TODO': '**TODO marker** — this code is incomplete or needs attention before release.',
  'FIXME': '**FIXME marker** — this code is known to be broken or suboptimal.',
  'HACK': '**HACK marker** — this code is a workaround; consider a proper fix.',
  'except:': '**Bare except** catches *everything*, including `SystemExit` and `KeyboardInterrupt`. Specify the exception type for safe error handling.',
};

export class HelperHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | undefined {

    // Check if hovering over a known keyword
    const wordRange = document.getWordRangeAtPosition(position);
    const word = wordRange ? document.getText(wordRange) : '';

    for (const [keyword, doc] of Object.entries(HOVER_DOCS)) {
      if (word === keyword || document.lineAt(position.line).text.includes(keyword)) {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`### 🛠 VSCode Helper\n\n${doc}`);
        md.isTrusted = true;

        // Also show any active diagnostics for this line
        const issues = analyzeDocument(document).filter(
          (i) => i.line === position.line
        );
        if (issues.length > 0) {
          md.appendMarkdown('\n\n---\n\n**Issues on this line:**\n');
          for (const issue of issues) {
            md.appendMarkdown(`\n- ${issue.message}`);
            if (issue.suggestion) {
              md.appendMarkdown(`\n  > 💡 ${issue.suggestion}`);
            }
          }
        }

        return new vscode.Hover(md);
      }
    }

    // Fallback: show diagnostics for hovered line
    const issues = analyzeDocument(document).filter(
      (i) => i.line === position.line
    );
    if (issues.length === 0) return undefined;

    const md = new vscode.MarkdownString();
    md.appendMarkdown('### 🛠 VSCode Helper — Issues on this line\n\n');
    for (const issue of issues) {
      md.appendMarkdown(`**${issue.message}**\n\n`);
      if (issue.suggestion) {
        md.appendMarkdown(`> 💡 *${issue.suggestion}*\n\n`);
      }
    }

    return new vscode.Hover(md);
  }
}
