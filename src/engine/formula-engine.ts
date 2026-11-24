/**
 * formula-engine.ts
 *
 * Custom Formula Evaluator — Safe Expression Parser for Calculated Columns
 *
 * React Concepts Demonstrated:
 * - Pure functional computation with zero side effects (safe for useMemo)
 * - No eval() / Function() — custom AST tokenizer + recursive-descent parser
 * - Deterministic outputs: identical inputs always produce identical results
 *
 * Supported operations:
 *   Arithmetic: +, -, *, /, % (mod), ** (power)
 *   Functions:  ABS, ROUND, CEIL, FLOOR, SQRT, LOG, MIN, MAX, IF, LEN, UPPER, LOWER, CONCAT
 *   Comparisons: >, <, >=, <=, ==, !=  (return 1 or 0 for IF usage)
 *   Parentheses: Full nesting support
 *   Column refs: [Column Name] syntax
 *   Literals: numbers, quoted strings
 */

import { parseNumberValue } from './profiler';

// ── Token Types ────────────────────────────────────────────────────────

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'COLUMN_REF'
  | 'FUNCTION'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

// ── AST Node Types ─────────────────────────────────────────────────────

type ASTNode =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'column'; name: string }
  | { kind: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { kind: 'unary'; op: string; operand: ASTNode }
  | { kind: 'call'; name: string; args: ASTNode[] };

// ── Tokenizer ──────────────────────────────────────────────────────────

const FUNCTIONS = new Set([
  'ABS', 'ROUND', 'CEIL', 'FLOOR', 'SQRT', 'LOG',
  'MIN', 'MAX', 'IF', 'LEN', 'UPPER', 'LOWER', 'CONCAT',
]);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // Whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // Number (including decimals)
    if (/\d/.test(ch) || (ch === '.' && i + 1 < input.length && /\d/.test(input[i + 1]))) {
      let num = '';
      while (i < input.length && (/\d/.test(input[i]) || input[i] === '.')) {
        num += input[i++];
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let str = '';
      while (i < input.length && input[i] !== quote) {
        str += input[i++];
      }
      i++; // closing quote
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // Column reference [Column Name]
    if (ch === '[') {
      i++;
      let name = '';
      while (i < input.length && input[i] !== ']') {
        name += input[i++];
      }
      i++; // closing bracket
      tokens.push({ type: 'COLUMN_REF', value: name });
      continue;
    }

    // Identifier (function name)
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < input.length && /[a-zA-Z_0-9]/.test(input[i])) {
        ident += input[i++];
      }
      const upper = ident.toUpperCase();
      if (FUNCTIONS.has(upper)) {
        tokens.push({ type: 'FUNCTION', value: upper });
      } else {
        throw new FormulaError(`Unknown identifier: "${ident}". Use [brackets] for column names.`);
      }
      continue;
    }

    // Multi-char operators
    if (i + 1 < input.length) {
      const two = input[i] + input[i + 1];
      if (['**', '>=', '<=', '==', '!='].includes(two)) {
        tokens.push({ type: 'OPERATOR', value: two });
        i += 2;
        continue;
      }
    }

    // Single-char operators and punctuation
    if ('+-*/%><!'.includes(ch)) {
      tokens.push({ type: 'OPERATOR', value: ch });
      i++;
      continue;
    }

    if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'COMMA', value: ',' }); i++; continue; }

    throw new FormulaError(`Unexpected character: "${ch}" at position ${i}`);
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

// ── Recursive-Descent Parser ───────────────────────────────────────────

class Parser {
  private pos = 0;
  private tokens: Token[];
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token { return this.tokens[this.pos]; }
  private advance(): Token { return this.tokens[this.pos++]; }

  private expect(type: TokenType): Token {
    const tok = this.advance();
    if (tok.type !== type) {
      throw new FormulaError(`Expected ${type} but got ${tok.type} ("${tok.value}")`);
    }
    return tok;
  }

  parse(): ASTNode {
    const node = this.parseComparison();
    if (this.peek().type !== 'EOF') {
      throw new FormulaError(`Unexpected token after expression: "${this.peek().value}"`);
    }
    return node;
  }

  // Comparison: >, <, >=, <=, ==, !=
  private parseComparison(): ASTNode {
    let left = this.parseAddSub();
    while (
      this.peek().type === 'OPERATOR' &&
      ['>', '<', '>=', '<=', '==', '!='].includes(this.peek().value)
    ) {
      const op = this.advance().value;
      const right = this.parseAddSub();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  // Addition / Subtraction
  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv();
    while (this.peek().type === 'OPERATOR' && ['+', '-'].includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseMulDiv();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  // Multiplication / Division / Modulo
  private parseMulDiv(): ASTNode {
    let left = this.parsePower();
    while (this.peek().type === 'OPERATOR' && ['*', '/', '%'].includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parsePower();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  // Power (**)
  private parsePower(): ASTNode {
    let left = this.parseUnary();
    while (this.peek().type === 'OPERATOR' && this.peek().value === '**') {
      this.advance();
      const right = this.parseUnary();
      left = { kind: 'binary', op: '**', left, right };
    }
    return left;
  }

  // Unary - or +
  private parseUnary(): ASTNode {
    if (this.peek().type === 'OPERATOR' && ['+', '-'].includes(this.peek().value)) {
      const op = this.advance().value;
      const operand = this.parseUnary();
      return { kind: 'unary', op, operand };
    }
    return this.parsePrimary();
  }

  // Primary: number, string, column ref, function call, parenthesized expression
  private parsePrimary(): ASTNode {
    const tok = this.peek();

    if (tok.type === 'NUMBER') {
      this.advance();
      return { kind: 'number', value: parseFloat(tok.value) };
    }

    if (tok.type === 'STRING') {
      this.advance();
      return { kind: 'string', value: tok.value };
    }

    if (tok.type === 'COLUMN_REF') {
      this.advance();
      return { kind: 'column', name: tok.value };
    }

    if (tok.type === 'FUNCTION') {
      this.advance();
      this.expect('LPAREN');
      const args: ASTNode[] = [];
      if (this.peek().type !== 'RPAREN') {
        args.push(this.parseComparison());
        while (this.peek().type === 'COMMA') {
          this.advance();
          args.push(this.parseComparison());
        }
      }
      this.expect('RPAREN');
      return { kind: 'call', name: tok.value, args };
    }

    if (tok.type === 'LPAREN') {
      this.advance();
      const expr = this.parseComparison();
      this.expect('RPAREN');
      return expr;
    }

    throw new FormulaError(`Unexpected token: "${tok.value}"`);
  }
}

// ── Evaluator ──────────────────────────────────────────────────────────

type RowData = Record<string, string | number | boolean | null>;

function evaluateNode(node: ASTNode, row: RowData): number | string {
  switch (node.kind) {
    case 'number':
      return node.value;

    case 'string':
      return node.value;

    case 'column': {
      let val = row[node.name];
      if (val === undefined) {
        // Case-insensitive fallback
        const lower = node.name.toLowerCase();
        const matchedKey = Object.keys(row).find((k) => k.toLowerCase() === lower);
        if (matchedKey) {
          val = row[matchedKey];
        } else {
          throw new FormulaError(`Column not found: [${node.name}]`);
        }
      }
      if (val === null) return 0;
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseNumberValue(val);
        if (parsed !== null) return parsed;
      }
      const num = Number(val);
      return isNaN(num) ? String(val) : num;
    }

    case 'unary': {
      const operand = evaluateNode(node.operand, row);
      if (typeof operand === 'string') throw new FormulaError('Cannot apply unary operator to string');
      return node.op === '-' ? -operand : operand;
    }

    case 'binary': {
      const left = evaluateNode(node.left, row);
      const right = evaluateNode(node.right, row);
      const l = typeof left === 'string' ? NaN : left;
      const r = typeof right === 'string' ? NaN : right;

      if (node.op === '+' && (typeof left === 'string' || typeof right === 'string')) {
        return String(left) + String(right);
      }

      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? 0 : l / r;
        case '%': return r === 0 ? 0 : l % r;
        case '**': return Math.pow(l, r);
        case '>': return l > r ? 1 : 0;
        case '<': return l < r ? 1 : 0;
        case '>=': return l >= r ? 1 : 0;
        case '<=': return l <= r ? 1 : 0;
        case '==': return left === right ? 1 : 0;
        case '!=': return left !== right ? 1 : 0;
        default: throw new FormulaError(`Unknown operator: ${node.op}`);
      }
    }

    case 'call': {
      const args = node.args.map((a) => evaluateNode(a, row));
      return evaluateFunction(node.name, args);
    }
  }
}

function evaluateFunction(name: string, args: (number | string)[]): number | string {
  const num = (v: number | string) => typeof v === 'number' ? v : Number(v);
  const str = (v: number | string) => String(v);

  switch (name) {
    case 'ABS': return Math.abs(num(args[0] ?? 0));
    case 'ROUND': return Math.round(num(args[0] ?? 0) * Math.pow(10, num(args[1] ?? 0))) / Math.pow(10, num(args[1] ?? 0));
    case 'CEIL': return Math.ceil(num(args[0] ?? 0));
    case 'FLOOR': return Math.floor(num(args[0] ?? 0));
    case 'SQRT': return args[0] !== undefined && num(args[0]) >= 0 ? Math.sqrt(num(args[0])) : 0;
    case 'LOG': return num(args[0]) > 0 ? Math.log(num(args[0])) : 0;
    case 'MIN': return Math.min(...args.map(num));
    case 'MAX': return Math.max(...args.map(num));
    case 'IF': return num(args[0]) !== 0 ? args[1] : (args[2] ?? 0);
    case 'LEN': return str(args[0]).length;
    case 'UPPER': return str(args[0]).toUpperCase();
    case 'LOWER': return str(args[0]).toLowerCase();
    case 'CONCAT': return args.map(str).join('');
    default: throw new FormulaError(`Unknown function: ${name}`);
  }
}

// ── Public API ─────────────────────────────────────────────────────────

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

/**
 * Parse and validate a formula string. Returns the AST if valid.
 * Throws FormulaError on syntax errors.
 */
export function parseFormula(formula: string): ASTNode {
  const tokens = tokenize(formula);
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Evaluate a parsed formula AST against a single data row.
 * Returns the computed value (number or string).
 */
export function evaluateFormula(ast: ASTNode, row: RowData): number | string {
  return evaluateNode(ast, row);
}

/**
 * Evaluate a formula string against an entire dataset,
 * producing the new column values for every row.
 */
export function computeColumn(
  formula: string,
  rows: RowData[]
): { values: (number | string)[]; error: string | null } {
  try {
    const ast = parseFormula(formula);
    const values = rows.map((row) => evaluateFormula(ast, row));
    return { values, error: null };
  } catch (err) {
    return {
      values: [],
      error: err instanceof FormulaError ? err.message : String(err),
    };
  }
}
