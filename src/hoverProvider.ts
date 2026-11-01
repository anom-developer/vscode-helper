import * as vscode from 'vscode';
import { HelperDiagnosticsProvider } from './diagnosticsProvider';
import { getEffectiveLanguage } from './i18n';

const HOVER_DOCS_RU: Record<string, string> = {
  'var': '**`var` имеет функциональную область видимости** и поднимается (hoisting) в начало функции. Это часто приводит к случайному затенению переменных и скрытым багам. Используйте `const` для неизменяемых значений или `let` при перезаписи.',
  'eval': '**`eval()` выполняет произвольную строку как код** — это создаёт критическую уязвимость внедрения кода (XSS/RCE) и мешает оптимизациям JIT в JavaScript-движке.',
  'debugger': '**Инструкция `debugger;`** останавливает выполнение при открытых инструментах разработчика. Её нельзя оставлять в продакшен-коде.',
  'console.log': '**Отладочный вывод в stdout** — полезен при локальной разработке, но перед релизом должен быть заменён на библиотеку логирования (Winston, Pino) или удален.',
  '==': '**Нестрогое равенство `==`** выполняет автоматическое приведение типов (например, `0 == ""` истинно). Используйте строгое равенство `===` для надёжного сравнения.',
  '!=': '**Нестрогое неравенство `!=`** выполняет автоматическое приведение типов. Используйте строгое неравенство `!==`.',
  'TODO': '**Маркер TODO** указывает на запланированную задачу или незаконченную часть кода, требующую завершения.',
  'FIXME': '**Маркер FIXME** помечает известные ошибки, краевые случаи или временные хаки, требующие внимания.',
  'HACK': '**Маркер HACK** помечает временный костыль или обходной путь. Рекомендуется рефакторинг.',
  'НАДО': '**Маркер НАДО/TODO** указывает на незаконченную задачу в кодовой базе.',
  'ИСПРАВИТЬ': '**Маркер ИСПРАВИТЬ/FIXME** помечает баг или проблему, требующую исправления.',
  'except:': '**Пустой `except:`** ловит абсолютно все исключения, включая `SystemExit` и `KeyboardInterrupt`. Указывайте тип: `except Exception:` или конкретный класс ошибки.',
  'unwrap': '**Метод `.unwrap()` в Rust** вызовет аварийную остановку (panic), если значение равно `Err` или `None`. Используйте оператор `?` или метод `.expect("...")`.'
};

const HOVER_DOCS_EN: Record<string, string> = {
  'var': '**`var` is function-scoped** and hoisted to the top of its enclosing function. Prefer `const` for immutable bindings, or `let` when the value is reassigned.',
  'eval': '**`eval()` executes arbitrary strings as code** — this represents a major security vulnerability (code injection/XSS) and prevents JavaScript JIT optimizations.',
  'debugger': '**`debugger;` breakpoint statement** halts execution when developer tools are attached. It should never be committed into production code.',
  'console.log': '**Standard output debug log** — suitable during local development, but should be removed or replaced with an enterprise logger before production deployment.',
  '==': '**Loose equality `==`** performs automatic type coercion (e.g., `0 == ""` is true). Use strict equality `===` for reliable, type-safe comparisons.',
  '!=': '**Loose inequality `!=`** performs type coercion. Use strict inequality `!==` instead.',
  'TODO': '**TODO marker** indicates planned future work or an incomplete implementation that needs to be addressed before release.',
  'FIXME': '**FIXME marker** highlights known bugs, edge cases, or temporary workarounds that require attention.',
  'HACK': '**HACK marker** marks non-ideal temporary workarounds; consider refactoring into a robust architecture.',
  'except:': '**Bare except** catches all exceptions indiscriminately, including `SystemExit` and `KeyboardInterrupt`. Specify exception types (`except Exception:`).',
  'unwrap': '**Rust `.unwrap()`** will cause a panic if the Result is `Err` or Option is `None`. Prefer error propagation with `?` or `.expect("...")`.'
};

export class HelperHoverProvider implements vscode.HoverProvider {
  private diagnosticsProvider: HelperDiagnosticsProvider;

  constructor(diagnosticsProvider: HelperDiagnosticsProvider) {
    this.diagnosticsProvider = diagnosticsProvider;
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | undefined {
    const config = vscode.workspace.getConfiguration('vscodeHelper');
    if (!config.get<boolean>('enable', true)) {
      return undefined;
    }

    const issues = this.diagnosticsProvider.getIssuesForDocument(document);
    // Find issues that encompass or neighbor the current cursor position
    const relevantIssues = issues.filter((i) => {
      const startCol = Math.max(0, i.col - 1);
      const endCol = i.endCol + 1;
      return i.line === position.line && position.character >= startCol && position.character <= endCol;
    });

    const lineText = document.lineAt(position.line).text;
    const wordRange = document.getWordRangeAtPosition(position);
    const word = wordRange ? document.getText(wordRange) : '';

    const isRu = getEffectiveLanguage() === 'ru';
    const docs = isRu ? HOVER_DOCS_RU : HOVER_DOCS_EN;
    let matchedDoc: string | undefined;

    for (const [keyword, doc] of Object.entries(docs)) {
      if (!keyword.includes('.') && !keyword.includes(':') && !keyword.includes('=')) {
        if (word === keyword) {
          matchedDoc = doc;
          break;
        }
      } else {
        const idx = lineText.indexOf(keyword);
        if (idx !== -1 && position.character >= idx && position.character <= idx + keyword.length) {
          matchedDoc = doc;
          break;
        }
      }
    }

    if (relevantIssues.length === 0 && !matchedDoc) {
      return undefined;
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    md.appendMarkdown('### 🛠 VSCode Helper\n\n');

    if (matchedDoc) {
      md.appendMarkdown(`${matchedDoc}\n\n`);
    }

    if (relevantIssues.length > 0) {
      if (matchedDoc) {
        md.appendMarkdown('---\n\n');
      }
      for (const issue of relevantIssues) {
        md.appendMarkdown(`**${issue.message}**\n\n`);
        if (issue.suggestion) {
          md.appendMarkdown(`> 💡 *${issue.suggestion}*\n\n`);
        }
        if (issue.fix) {
          const shortcut = process.platform === 'darwin' ? 'Cmd+.' : 'Ctrl+.';
          const autoFixText = isRu
            ? `*[Доступно авто-исправление по нажатию ${shortcut}]*`
            : `*[Auto-fix available via QuickFix ${shortcut}]*`;
          md.appendMarkdown(`${autoFixText}\n\n`);
        }
      }
    }

    return new vscode.Hover(md);
  }
}
