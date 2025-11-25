import { describe, it, expect } from 'vitest';
import { lintSQL } from '../lib/sqlLinter';

describe('lintSQL', () => {
  it('warns on SELECT *', () => {
    const issues = lintSQL('SELECT * FROM users');
    expect(issues.some(i => i.message.includes('SELECT *'))).toBe(true);
    expect(issues[0].type).toBe('warning');
  });

  it('errors on DELETE without WHERE', () => {
    const issues = lintSQL('DELETE FROM users;');
    expect(issues.some(i => i.type === 'error' && i.message.includes('DELETE'))).toBe(true);
  });

  it('errors on UPDATE without WHERE', () => {
    const issues = lintSQL('UPDATE users SET name = "foo"');
    expect(issues.some(i => i.type === 'error' && i.message.includes('UPDATE'))).toBe(true);
  });

  it('warns on LIKE with leading wildcard', () => {
    const issues = lintSQL("SELECT id FROM users WHERE name LIKE '%foo'");
    expect(issues.some(i => i.message.includes('leading wildcard'))).toBe(true);
  });

  it('returns no issues for clean query', () => {
    const issues = lintSQL('SELECT id, name FROM users WHERE id = 1');
    const errors = issues.filter(i => i.type === 'error');
    expect(errors).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(lintSQL('')).toEqual([]);
  });
});
