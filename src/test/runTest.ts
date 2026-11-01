import * as assert from 'assert';
import { analyzeDocument, isInsideStringOrComment, DiagnosticSeverity } from '../rules';

function mockDoc(lines: string[], languageId: string) {
  return {
    languageId,
    lineCount: lines.length,
    lineAt: (i: number) => ({ text: lines[i] })
  };
}

let passed = 0;
let total = 0;

function it(name: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: unknown) {
    console.error(`  ✗ ${name}`);
    console.error('    ', err instanceof Error ? err.message : err);
    throw err;
  }
}

console.log('\n🧪 Running VSCode Helper Tests...\n');

// ─── String and Comment Scanner Tests ─────────────────────────────────────────
console.log('Testing Syntax State Scanner (isInsideStringOrComment):');

it('detects single-line JS comment', () => {
  const line = 'const a = 1; // comment here var x';
  assert.strictEqual(isInsideStringOrComment(line, 5), false);
  assert.strictEqual(isInsideStringOrComment(line, 20), true);
});

it('detects string literals', () => {
  const line = 'const msg = "var x = 1";';
  assert.strictEqual(isInsideStringOrComment(line, 2), false);
  assert.strictEqual(isInsideStringOrComment(line, 15), true);
});

it('handles escaped quotes and backslashes in strings', () => {
  const escapedQuote = 'const s = "hello \\" var x"; var real = 1;';
  // Index of 'var' inside string
  assert.strictEqual(isInsideStringOrComment(escapedQuote, 19), true);
  // Index of 'var' outside string
  assert.strictEqual(isInsideStringOrComment(escapedQuote, 30), false);

  const doubleBackslash = 'const path = "C:\\\\folder\\\\"; var real = 2;';
  // After closing quote
  assert.strictEqual(isInsideStringOrComment(doubleBackslash, 32), false);
});

// ─── JavaScript / TypeScript Rules Tests ──────────────────────────────────────
console.log('\nTesting JS/TS Rules:');

it('detects no-var and provides auto-fix', () => {
  const doc = mockDoc(['var myValue = 42;'], 'javascript');
  const issues = analyzeDocument(doc);
  const varIssue = issues.find((i) => i.code === 'no-var');
  assert.ok(varIssue, 'no-var issue should be found');
  assert.strictEqual(varIssue?.fix, 'const myValue = 42;');
});

it('does not flag no-var in comments or strings', () => {
  const doc = mockDoc([
    '// var myValue = 42;',
    'const str = "var myValue = 42";'
  ], 'typescript');
  const issues = analyzeDocument(doc);
  const varIssues = issues.filter((i) => i.code === 'no-var');
  assert.strictEqual(varIssues.length, 0);
});

it('detects eqeqeq and fixes loose equality with exact column range', () => {
  const doc = mockDoc(['if (a == b) { }'], 'typescript');
  const issues = analyzeDocument(doc);
  const eqIssue = issues.find((i) => i.code === 'eqeqeq');
  assert.ok(eqIssue);
  assert.strictEqual(eqIssue?.col, 6);
  assert.strictEqual(eqIssue?.endCol, 8);
  assert.strictEqual(eqIssue?.fix, 'if (a === b) { }');
});

it('ignores common technical numbers in magic-number rule', () => {
  const doc = mockDoc([
    'const delay = 300;',
    'const priority = 100;',
    'const limit = 120;',
    'const magic = 987654;'
  ], 'typescript');
  const issues = analyzeDocument(doc);
  const magicIssues = issues.filter((i) => i.code === 'magic-number');
  assert.strictEqual(magicIssues.length, 1);
  assert.ok(magicIssues[0].message.includes('987654'));
});

it('does not flag TODO inside quoted strings as code comment', () => {
  const doc = mockDoc([
    'const snippet = "// TODO: do something";'
  ], 'typescript');
  const issues = analyzeDocument(doc);
  assert.strictEqual(issues.filter((i) => i.code === 'todo-comment').length, 0);
});

it('detects no-debugger and removes it', () => {
  const doc = mockDoc(['  debugger;'], 'javascript');
  const issues = analyzeDocument(doc);
  const debugIssue = issues.find((i) => i.code === 'no-debugger');
  assert.ok(debugIssue);
  assert.strictEqual(debugIssue?.fix, '');
});

it('detects no-console calls', () => {
  const doc = mockDoc(['console.log("hello world");'], 'typescript');
  const issues = analyzeDocument(doc);
  assert.ok(issues.some((i) => i.code === 'no-console'));
});

it('detects empty catch blocks', () => {
  const doc = mockDoc(['try { doSomething(); } catch (e) {}'], 'javascript');
  const issues = analyzeDocument(doc);
  const emptyCatch = issues.find((i) => i.code === 'empty-catch');
  assert.ok(emptyCatch);
  assert.ok(emptyCatch?.fix?.includes('console.error(e);'));
});

it('detects NaN comparisons', () => {
  const doc = mockDoc(['if (value === NaN) return false;'], 'typescript');
  const issues = analyzeDocument(doc);
  assert.ok(issues.some((i) => i.code === 'no-nan-compare'));
});

// ─── Python Rules Tests ───────────────────────────────────────────────────────
console.log('\nTesting Python Rules:');

it('detects bare except and fixes it', () => {
  const doc = mockDoc(['try:\n', '    run()\n', 'except:'], 'python');
  const issues = analyzeDocument(doc);
  const bareIssue = issues.find((i) => i.code === 'py-bare-except');
  assert.ok(bareIssue);
  assert.strictEqual(bareIssue?.fix, 'except Exception:');
});

it('detects mutable default arguments (list and dict, but NOT tuple)', () => {
  const doc = mockDoc([
    'def func1(items=[]): pass',
    'def func2(data={}): pass',
    'def func3(point=()): pass' // Immutable tuple — must NOT be flagged
  ], 'python');
  const issues = analyzeDocument(doc);
  const mutableIssues = issues.filter((i) => i.code === 'py-mutable-default');
  assert.strictEqual(mutableIssues.length, 2);
  assert.strictEqual(mutableIssues[0].line, 0);
  assert.strictEqual(mutableIssues[1].line, 1);
});

it('detects None comparison and fixes with is/is not', () => {
  const doc = mockDoc(['if user == None:', 'if user != None:'], 'python');
  const issues = analyzeDocument(doc);
  const noneIssues = issues.filter((i) => i.code === 'py-none-compare');
  assert.strictEqual(noneIssues.length, 2);
  assert.strictEqual(noneIssues[0].fix, 'if user is None:');
  assert.strictEqual(noneIssues[1].fix, 'if user is not None:');
});

// ─── Java, C++, Go, Rust Tests ────────────────────────────────────────────────
console.log('\nTesting Java, C++, Go, Rust Rules:');

it('detects Java string == comparison', () => {
  const doc = mockDoc(['if (status == "ACTIVE") { }'], 'java');
  const issues = analyzeDocument(doc);
  assert.ok(issues.some((i) => i.code === 'java-string-eq'));
});

it('detects C unsafe gets and modern C++ NULL', () => {
  const doc = mockDoc(['gets(buffer);', 'int* p = NULL;'], 'cpp');
  const issues = analyzeDocument(doc);
  assert.ok(issues.some((i) => i.code === 'c-unsafe-gets'));
  const nullIssue = issues.find((i) => i.code === 'cpp-null');
  assert.ok(nullIssue);
  assert.strictEqual(nullIssue?.fix, 'int* p = nullptr;');
});

it('detects Go panic and Rust unwrap', () => {
  const goDoc = mockDoc(['panic("something broke")'], 'go');
  assert.ok(analyzeDocument(goDoc).some((i) => i.code === 'go-panic'));

  const rustDoc = mockDoc(['let val = opt.unwrap();'], 'rust');
  assert.ok(analyzeDocument(rustDoc).some((i) => i.code === 'rust-unwrap'));
});

// ─── Generic Rules & Comment Suppression Tests ────────────────────────────────
console.log('\nTesting Suppression & Generic Rules:');

it('respects vscode-helper-disable-line', () => {
  const doc = mockDoc(['var suppressed = 1; // vscode-helper-disable-line no-var'], 'javascript');
  const issues = analyzeDocument(doc);
  assert.strictEqual(issues.filter((i) => i.code === 'no-var').length, 0);
});

it('respects vscode-helper-disable-next-line', () => {
  const doc = mockDoc([
    '// vscode-helper-disable-next-line',
    'var suppressed = 1;'
  ], 'javascript');
  const issues = analyzeDocument(doc);
  assert.strictEqual(issues.filter((i) => i.code === 'no-var').length, 0);
});

it('detects and fixes trailing whitespace', () => {
  const doc = mockDoc(['const clean = 1;   '], 'typescript');
  const issues = analyzeDocument(doc);
  const trailing = issues.find((i) => i.code === 'trailing-whitespace');
  assert.ok(trailing);
  assert.strictEqual(trailing?.fix, 'const clean = 1;');
});

it('filters issues by minSeverity', () => {
  const doc = mockDoc([
    'var x = 1;', // Warning (1)
    'debugger;', // Error (0)
    'console.log("hi");' // Information (2)
  ], 'javascript');

  const onlyErrors = analyzeDocument(doc, { minSeverity: DiagnosticSeverity.Error });
  assert.strictEqual(onlyErrors.length, 1);
  assert.strictEqual(onlyErrors[0].code, 'no-debugger');

  const warningsAndErrors = analyzeDocument(doc, { minSeverity: DiagnosticSeverity.Warning });
  assert.strictEqual(warningsAndErrors.length, 2);
  assert.ok(warningsAndErrors.some((i) => i.code === 'no-var'));
  assert.ok(warningsAndErrors.some((i) => i.code === 'no-debugger'));
});

// ─── Russian Language Support Tests ───────────────────────────────────────────
console.log('\nTesting Russian Language Support:');

it('detects Russian Cyrillic homoglyphs in code identifiers and fixes them', () => {
  // 'vаr' has Cyrillic 'а' (\u0430)
  const doc = mockDoc(['const v\u0430r = 42;'], 'javascript');
  const issues = analyzeDocument(doc);
  const cyrillicIssue = issues.find((i) => i.code === 'cyrillic-in-code');
  assert.ok(cyrillicIssue, 'Should detect Cyrillic letter in identifier');
  assert.strictEqual(cyrillicIssue?.severity, DiagnosticSeverity.Error);
  assert.strictEqual(cyrillicIssue?.fix, 'const var = 42;');
});

it('does not flag Russian text inside comments and strings', () => {
  const doc = mockDoc([
    '// Это обычный русский комментарий',
    'const greeting = "Привет, мир!";'
  ], 'typescript');
  const issues = analyzeDocument(doc);
  const cyrillicIssues = issues.filter((i) => i.code === 'cyrillic-in-code');
  assert.strictEqual(cyrillicIssues.length, 0, 'Russian in strings and comments should not be flagged');
});

it('detects Russian TODO/FIXME markers in comments', () => {
  const pyDoc = mockDoc([
    '# НАДО: сделать рефакторинг',
    '# ИСПРАВИТЬ: обработать исключение'
  ], 'python');
  const pyIssues = analyzeDocument(pyDoc);
  assert.ok(pyIssues.some((i) => i.code === 'py-todo' && i.message.includes('НАДО')));
  assert.ok(pyIssues.some((i) => i.code === 'py-todo' && i.message.includes('ИСПРАВИТЬ')));

  const jsDoc = mockDoc([
    '// НАДО: сделать валидацию',
    '// КОСТЫЛЬ: временный фикс'
  ], 'javascript');
  const jsIssues = analyzeDocument(jsDoc);
  assert.ok(jsIssues.some((i) => i.code === 'todo-comment' && i.message.includes('НАДО')));
  assert.ok(jsIssues.some((i) => i.code === 'todo-comment' && i.message.includes('КОСТЫЛЬ')));
});

console.log(`\n🎉 All tests passed! (${passed}/${total})\n`);
