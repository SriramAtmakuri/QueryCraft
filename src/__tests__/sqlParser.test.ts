import { describe, it, expect } from 'vitest';
import { parseSQLSchema } from '../lib/sqlParser';

const schema = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR(255),
  name TEXT
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  amount DECIMAL(10,2),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

describe('parseSQLSchema', () => {
  it('parses table names', () => {
    const result = parseSQLSchema(schema);
    const names = result.tables.map(t => t.name);
    expect(names).toContain('users');
    expect(names).toContain('orders');
  });

  it('parses columns', () => {
    const result = parseSQLSchema(schema);
    const users = result.tables.find(t => t.name === 'users')!;
    const colNames = users.columns.map(c => c.name);
    expect(colNames).toContain('email');
    expect(colNames).toContain('name');
  });

  it('detects primary keys', () => {
    const result = parseSQLSchema(schema);
    const users = result.tables.find(t => t.name === 'users')!;
    const pk = users.columns.find(c => c.name === 'id');
    expect(pk?.isPrimaryKey).toBe(true);
  });

  it('parses foreign key relationships', () => {
    const result = parseSQLSchema(schema);
    expect(result.relationships.length).toBeGreaterThan(0);
    const rel = result.relationships[0];
    expect(rel.fromTable).toBe('orders');
    expect(rel.toTable).toBe('users');
  });

  it('returns empty result for empty input', () => {
    const result = parseSQLSchema('');
    expect(result.tables).toHaveLength(0);
    expect(result.relationships).toHaveLength(0);
  });
});
