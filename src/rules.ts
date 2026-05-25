import * as vscode from 'vscode';

export interface CodeIssue {
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  message: string;
  severity: vscode.DiagnosticSeverity;
  code: string;
  fix?: string;
  suggestion?: string;
}

export interface LanguageRule {
  id: string;
  description: string;
  pattern: RegExp;
  severity: vscode.DiagnosticSeverity;
  message: (match: RegExpMatchArray) => string;
  fix?: (match: RegExpMatchArray, line: string) => string;
  suggestion?: string;
}

// ─── JavaScript / TypeScript rules ────────────────────────────────────────────
const JS_RULES: LanguageRule[] = [
  {
    id: 'no-var',
    description: 'Prefer let/const over var',
    pattern: /\bvar\s+(\w+)/,
    severity: vscode.DiagnosticSeverity.Warning,
    message: () => '⚠️ Avoid `var` — use `let` or `const` instead.',
    fix: (match, line) => line.replace(/\bvar\b/, 'const'),
    suggestion: 'Replace `var` with `const` (or `let` if the value changes).'
  },
  {
    id: 'no-console',
    description: 'No console.log in production',
    pattern: /console\.(log|warn|error|info)\s*\(/,
    severity: vscode.DiagnosticSeverity.Information,
    message: () => 'ℹ️ `console.*` calls should be removed before production.',
    suggestion: 'Use a proper logging library (e.g. winston, pino) or remove debug logs.'
  },
  {
    id: 'eqeqeq',
    description: 'Use strict equality',
    pattern: /[^=!<>]={2}(?!=)[^=]/,
    severity: vscode.DiagnosticSeverity.Warning,
    message: () => '⚠️ Use `===` instead of `==` to avoid type coercion.',
    fix: (_, line) => line.replace(/([^=!<>])==(?!=)([^=])/g, '$1===$2'),
    suggestion: 'Strict equality (`===`) prevents unexpected type coercions.'
  },
  {
    id: 'no-unused-var-hint',
    description: 'Possibly unused variable',
    pattern: /(?:const|let|var)\s+_(\w+)\s*=/,
    severity: vscode.DiagnosticSeverity.Hint,
    message: (m) => `💡 Variable \`_${m[1]}\` looks intentionally unused — document why if so.`,
    suggestion: 'If the variable is truly unused, consider removing it.'
  },
  {
    id: 'todo-comment',
    description: 'TODO comment detected',
    pattern: /\/\/\s*TODO[:：]?\s*.+/i,
    severity: vscode.DiagnosticSeverity.Information,
    message: () => '📝 TODO comment — remember to address this before shipping.'
  },
  {
    id: 'empty-catch',
    description: 'Empty catch block',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    severity: vscode.DiagnosticSeverity.Warning,
    message: () => '⚠️ Empty catch block silently swallows errors.',
    suggestion: 'At minimum log the error or rethrow it.'
  },
  {
    id: 'no-eval',
    description: 'No eval()',
    pattern: /\beval\s*\(/,
    severity: vscode.DiagnosticSeverity.Error,
    message: () => '🚫 `eval()` is dangerous and should never be used.',
    suggestion: 'Use JSON.parse(), Function constructor, or restructure logic instead of eval.'
  },
  {
    id: 'magic-number',
    description: 'Magic number',
    pattern: /(?<![.'\w])(?<!\/\/.*)(?:[-+]?\d{3,}|(?<!\d)\d+\.\d+)(?!\w)(?!\s*[:,\]])(?!['".])/,
    severity: vscode.DiagnosticSeverity.Hint,
    message: (m) => `💡 Magic number \`${m[0]}\` — consider extracting it to a named constant.`,
    suggestion: 'Named constants make code more readable and easier to change.'
  }
];

// ─── Python rules ──────────────────────────────────────────────────────────────
const PY_RULES: LanguageRule[] = [
  {
    id: 'py-print',
    description: 'print() in production code',
    pattern: /^\s*print\s*\(/,
    severity: vscode.DiagnosticSeverity.Information,
    message: () => 'ℹ️ `print()` detected — use the `logging` module in production.',
    suggestion: 'Replace with `logging.debug()` / `logging.info()` etc.'
  },
  {
    id: 'py-bare-except',
    description: 'Bare except clause',
    pattern: /^\s*except\s*:/,
    severity: vscode.DiagnosticSeverity.Warning,
    message: () => '⚠️ Bare `except:` catches everything including `SystemExit` and `KeyboardInterrupt`.',
    fix: (_, line) => line.replace(/except\s*:/, 'except Exception:'),
    suggestion: 'Catch specific exceptions: `except ValueError:` or at least `except Exception:`.'
  },
  {
    id: 'py-mutable-default',
    description: 'Mutable default argument',
    pattern: /def\s+\w+\([^)]*=\s*(?:\[\]|\{\}|\(\))/,
    severity: vscode.DiagnosticSeverity.Warning,
    message: () => '⚠️ Mutable default argument — shared across all calls!',
    suggestion: 'Use `None` as default and initialise inside the function body.'
  },
  {
    id: 'py-todo',
    description: 'TODO comment',
    pattern: /#\s*TODO[:：]?\s*.+/i,
    severity: vscode.DiagnosticSeverity.Information,
    message: () => '📝 TODO comment — address before shipping.'
  },
  {
    id: 'py-wildcard-import',
    description: 'Wildcard import',
    pattern: /from\s+\S+\s+import\s+\*/,
    severity: vscode.DiagnosticSeverity.Warning,
    message: () => '⚠️ Wildcard import pollutes the namespace.',
    suggestion: 'Import only what you need: `from module import ClassA, func_b`.'
  }
];

// ─── Generic rules (all languages) ────────────────────────────────────────────
const GENERIC_RULES: LanguageRule[] = [
  {
    id: 'long-line',
    description: 'Line too long',
    pattern: /.{121,}/,
    severity: vscode.DiagnosticSeverity.Hint,
    message: (m) => `💡 Line is ${m[0].length} characters — consider breaking it up (max 120).`
  },
  {
    id: 'trailing-whitespace',
    description: 'Trailing whitespace',
    pattern: /[ \t]+$/,
    severity: vscode.DiagnosticSeverity.Hint,
    message: () => '💡 Trailing whitespace — clean it up.',
    fix: (_, line) => line.trimEnd()
  }
];

// ─── Public API ────────────────────────────────────────────────────────────────
export function getRulesForLanguage(languageId: string): LanguageRule[] {
  const base = [...GENERIC_RULES];
  if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(languageId)) {
    return [...JS_RULES, ...base];
  }
  if (languageId === 'python') {
    return [...PY_RULES, ...base];
  }
  return base;
}

export function analyzeDocument(document: vscode.TextDocument): CodeIssue[] {
  const rules = getRulesForLanguage(document.languageId);
  const issues: CodeIssue[] = [];

  for (let i = 0; i < document.lineCount; i++) {
    const lineText = document.lineAt(i).text;

    for (const rule of rules) {
      const match = lineText.match(rule.pattern);
      if (!match || match.index === undefined) continue;

      const col = match.index;
      const endCol = col + match[0].length;

      issues.push({
        line: i,
        col,
        endLine: i,
        endCol,
        message: rule.message(match),
        severity: rule.severity,
        code: rule.id,
        fix: rule.fix ? rule.fix(match, lineText) : undefined,
        suggestion: rule.suggestion
      });
    }
  }

  return issues;
}
