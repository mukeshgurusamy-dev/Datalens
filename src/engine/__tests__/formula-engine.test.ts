import { describe, it, expect } from 'vitest';
import { parseFormula, evaluateFormula, computeColumn, FormulaError } from '../formula-engine';

describe('parseFormula', () => {
  it('parses simple arithmetic', () => {
    const ast = parseFormula('1 + 2');
    expect(ast.kind).toBe('binary');
  });

  it('parses column references', () => {
    const ast = parseFormula('[Revenue] * 2');
    expect(ast.kind).toBe('binary');
  });

  it('parses function calls', () => {
    const ast = parseFormula('ROUND([Price] / [Quantity], 2)');
    expect(ast.kind).toBe('call');
  });

  it('throws on unknown identifiers', () => {
    expect(() => parseFormula('UNKNOWN(1)')).toThrow(FormulaError);
  });

  it('throws on unexpected characters', () => {
    expect(() => parseFormula('1 @ 2')).toThrow(FormulaError);
  });
});

describe('evaluateFormula', () => {
  it('evaluates arithmetic correctly', () => {
    const ast = parseFormula('3 + 4 * 2');
    expect(evaluateFormula(ast, {})).toBe(11);
  });

  it('evaluates column references', () => {
    const ast = parseFormula('[Revenue] - [Cost]');
    expect(evaluateFormula(ast, { Revenue: 100, Cost: 30 })).toBe(70);
  });

  it('evaluates power operator', () => {
    const ast = parseFormula('2 ** 3');
    expect(evaluateFormula(ast, {})).toBe(8);
  });

  it('evaluates comparison operators', () => {
    const ast = parseFormula('[Value] > 50');
    expect(evaluateFormula(ast, { Value: 80 })).toBe(1);
    expect(evaluateFormula(ast, { Value: 30 })).toBe(0);
  });

  it('evaluates IF function', () => {
    const ast = parseFormula('IF([Revenue] > 100, "High", "Low")');
    expect(evaluateFormula(ast, { Revenue: 200 })).toBe('High');
    expect(evaluateFormula(ast, { Revenue: 50 })).toBe('Low');
  });

  it('evaluates ROUND function', () => {
    const ast = parseFormula('ROUND(3.14159, 2)');
    expect(evaluateFormula(ast, {})).toBe(3.14);
  });

  it('evaluates ABS function', () => {
    const ast = parseFormula('ABS(-42)');
    expect(evaluateFormula(ast, {})).toBe(42);
  });

  it('evaluates nested functions', () => {
    const ast = parseFormula('ROUND(ABS(-3.567), 1)');
    expect(evaluateFormula(ast, {})).toBe(3.6);
  });

  it('evaluates string functions', () => {
    const ast = parseFormula('UPPER("hello")');
    expect(evaluateFormula(ast, {})).toBe('HELLO');
  });

  it('evaluates CONCAT', () => {
    const ast = parseFormula('CONCAT([Name], " - ", [City])');
    expect(evaluateFormula(ast, { Name: 'Alice', City: 'NYC' })).toBe('Alice - NYC');
  });

  it('evaluates LEN', () => {
    const ast = parseFormula('LEN("test")');
    expect(evaluateFormula(ast, {})).toBe(4);
  });

  it('handles division by zero gracefully', () => {
    const ast = parseFormula('[A] / [B]');
    expect(evaluateFormula(ast, { A: 100, B: 0 })).toBe(0);
  });

  it('handles unary minus', () => {
    const ast = parseFormula('-[Revenue]');
    expect(evaluateFormula(ast, { Revenue: 50 })).toBe(-50);
  });

  it('throws on missing column', () => {
    const ast = parseFormula('[Missing]');
    expect(() => evaluateFormula(ast, {})).toThrow('Column not found');
  });
});

describe('computeColumn', () => {
  it('computes values for all rows', () => {
    const rows = [
      { Revenue: 100, Cost: 30 },
      { Revenue: 200, Cost: 50 },
      { Revenue: 300, Cost: 100 },
    ];
    const result = computeColumn('[Revenue] - [Cost]', rows);
    expect(result.error).toBeNull();
    expect(result.values).toEqual([70, 150, 200]);
  });

  it('returns error for invalid formula', () => {
    const result = computeColumn('[[invalid', [{}]);
    expect(result.error).toBeTruthy();
    expect(result.values).toEqual([]);
  });

  it('handles percentage formula', () => {
    const rows = [{ Part: 25, Total: 100 }];
    const result = computeColumn('ROUND([Part] / [Total] * 100, 1)', rows);
    expect(result.error).toBeNull();
    expect(result.values).toEqual([25]);
  });
});
