import * as vscode from 'vscode';

interface Snippet {
  label: string;
  detail: string;
  documentation: string;
  insertText: string;
  languages?: string[];
}

const SNIPPETS: Snippet[] = [
  // ─── JavaScript / TypeScript ───────────────────────────────────────────────
  {
    label: 'try-catch',
    detail: 'Try/catch block with error logging',
    documentation: 'Creates a clean try/catch block that logs errors properly instead of swallowing them.',
    insertText: 'try {\n\t$1\n} catch (error) {\n\tconsole.error(\'Error:\', error);\n\tthrow error;\n}',
    languages: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact']
  },
  {
    label: 'async-fn',
    detail: 'Typed async arrow function',
    documentation: 'Creates a properly typed async arrow function.',
    insertText: 'const ${1:name} = async (${2:params}): Promise<${3:void}> => {\n\t$4\n};',
    languages: ['typescript', 'typescriptreact']
  },
  {
    label: 'const-fn',
    detail: 'Arrow function declaration with const',
    documentation: 'Modern arrow function with const binding.',
    insertText: 'const ${1:name} = (${2:params}) => {\n\t$3\n};',
    languages: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact']
  },
  {
    label: 'log-info',
    detail: 'Structured log entry with ISO timestamp',
    documentation: 'Structured log message with timestamp and payload.',
    insertText: 'console.info(`[${new Date().toISOString()}] ${1:message}`, { $2 });',
    languages: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact']
  },

  // ─── Python ────────────────────────────────────────────────────────────────
  {
    label: 'def-safe',
    detail: 'Type-annotated Python function',
    documentation: 'Python function definition with explicit parameter and return type hints.',
    insertText: 'def ${1:name}(${2:param}: ${3:type}) -> ${4:return_type}:\n\t"""${5:Function description.}"""\n\t$6',
    languages: ['python']
  },
  {
    label: 'try-except',
    detail: 'Safe try/except with logging',
    documentation: 'Python try/except block that logs the exception using logging module.',
    insertText: 'try:\n\t$1\nexcept ${2:Exception} as e:\n\tlogging.exception("Error in ${1:name}: %s", e)\n\traise',
    languages: ['python']
  },
  {
    label: 'dataclass',
    detail: 'Python dataclass model',
    documentation: 'Python dataclass with type annotations.',
    insertText: '@dataclass\nclass ${1:ModelName}:\n\t${2:field}: ${3:str}\n',
    languages: ['python']
  },
  {
    label: 'with-open',
    detail: 'Safe file context manager',
    documentation: 'Opens file using with statement for guaranteed cleanup.',
    insertText: 'with open(${1:file_path}, "${2:r}", encoding="utf-8") as f:\n\t${3:content = f.read()}',
    languages: ['python']
  },

  // ─── Go ───────────────────────────────────────────────────────────────────
  {
    label: 'err-check',
    detail: 'Standard Go error check',
    documentation: 'Idiomatic Go error check pattern.',
    insertText: 'if err != nil {\n\treturn fmt.Errorf("${1:operation failed}: %w", err)\n}',
    languages: ['go']
  },

  // ─── Rust ─────────────────────────────────────────────────────────────────
  {
    label: 'fn-result',
    detail: 'Rust function returning Result',
    documentation: 'Rust function signature returning Result<T, E>.',
    insertText: 'pub fn ${1:name}(${2:args}) -> Result<${3:()}, ${4:Box<dyn std::error::Error>}> {\n\t$5\n\tOk(())\n}',
    languages: ['rust']
  },

  // ─── Generic comments & helpers ───────────────────────────────────────────
  {
    label: 'todo',
    detail: 'Standard TODO comment',
    documentation: 'Track pending task with author and description.',
    insertText: '// TODO(${1:author}): ${2:description}',
  },
  {
    label: 'fixme',
    detail: 'Standard FIXME comment',
    documentation: 'Marks code requiring a bug fix.',
    insertText: '// FIXME: ${1:description}',
  },
  {
    label: 'nado',
    detail: 'Русский комментарий НАДО (TODO)',
    documentation: 'Отслеживание незавершенной задачи на русском языке.',
    insertText: '// НАДО(${1:автор}): ${2:описание}',
  },
  {
    label: 'ispravit',
    detail: 'Русский комментарий ИСПРАВИТЬ (FIXME)',
    documentation: 'Пометка участка кода, требующего исправления.',
    insertText: '// ИСПРАВИТЬ: ${1:описание проблемы}',
  },
  {
    label: 'kostyl',
    detail: 'Русский комментарий КОСТЫЛЬ (HACK)',
    documentation: 'Пометка временного обходного решения с пояснением.',
    insertText: '// КОСТЫЛЬ: ${1:почему это сделано временно}',
  },
  {
    label: 'vnimanie',
    detail: 'Русский комментарий ВНИМАНИЕ (WARNING)',
    documentation: 'Предупреждение для других разработчиков.',
    insertText: '// ВНИМАНИЕ: ${1:важное предупреждение}',
  },
  {
    label: 'helper-disable-line',
    detail: 'Disable VSCode Helper on this line',
    documentation: 'Suppresses VSCode Helper warnings on the current line.',
    insertText: '// vscode-helper-disable-line ${1:rule-id}',
  },
  {
    label: 'helper-disable-next-line',
    detail: 'Disable VSCode Helper on next line',
    documentation: 'Suppresses VSCode Helper warnings on the upcoming line.',
    insertText: '// vscode-helper-disable-next-line ${1:rule-id}',
  }
];

export class HelperCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const config = vscode.workspace.getConfiguration('vscodeHelper');
    if (!config.get<boolean>('enable', true)) {
      return [];
    }

    const lang = document.languageId;
    const linePrefix = document.lineAt(position).text.substring(0, position.character);
    const items: vscode.CompletionItem[] = [];

    for (const snippet of SNIPPETS) {
      if (snippet.languages && !snippet.languages.includes(lang)) continue;

      const item = new vscode.CompletionItem(snippet.label, vscode.CompletionItemKind.Snippet);
      item.detail = snippet.detail;
      item.documentation = new vscode.MarkdownString(`🛠 **VSCode Helper**\n\n${snippet.documentation}`);
      item.insertText = new vscode.SnippetString(snippet.insertText);
      item.sortText = `0_${snippet.label}`;
      item.filterText = snippet.label;
      items.push(item);
    }

    // Dynamic: suggest const over var
    if (linePrefix.trim().endsWith('var')) {
      const constSuggest = new vscode.CompletionItem('const (recommended)', vscode.CompletionItemKind.Keyword);
      constSuggest.insertText = 'const ';
      constSuggest.detail = 'VSCode Helper: Prefer const over var';
      const docText = '`const` creates a block-scoped binding that prevents accidental reassignment.';
      constSuggest.documentation = new vscode.MarkdownString(docText);
      constSuggest.preselect = true;
      items.push(constSuggest);
    }

    return items;
  }
}
