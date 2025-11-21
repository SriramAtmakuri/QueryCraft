// SQL Linting - Real-time syntax validation and best practice warnings

export interface LintIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  suggestion?: string;
}

export const lintSQL = (sql: string): LintIssue[] => {
  const issues: LintIssue[] = [];
  const lines = sql.split('\n');
  const upperSQL = sql.toUpperCase();

  // Check for SELECT *
  if (/SELECT\s+\*/i.test(sql)) {
    issues.push({
      type: 'warning',
      message: 'Avoid SELECT * - specify columns explicitly for better performance',
      suggestion: 'List specific column names instead of using *'
    });
  }

  // Check for missing WHERE in DELETE/UPDATE
  if (/DELETE\s+FROM\s+\w+\s*(?:;|$)/i.test(sql) && !/WHERE/i.test(sql)) {
    issues.push({
      type: 'error',
      message: 'DELETE without WHERE clause will delete all rows',
      suggestion: 'Add a WHERE clause to limit affected rows'
    });
  }

  if (/UPDATE\s+\w+\s+SET/i.test(sql) && !/WHERE/i.test(sql)) {
    issues.push({
      type: 'error',
      message: 'UPDATE without WHERE clause will update all rows',
      suggestion: 'Add a WHERE clause to limit affected rows'
    });
  }

  // Check for LIKE with leading wildcard (performance issue)
  if (/LIKE\s+['"]%/i.test(sql)) {
    issues.push({
      type: 'warning',
      message: 'LIKE with leading wildcard cannot use indexes',
      suggestion: 'Consider using full-text search for better performance'
    });
  }

  // Check for != instead of <>
  if (/!=/.test(sql)) {
    issues.push({
      type: 'info',
      message: 'Consider using <> instead of != for SQL standard compliance',
      suggestion: 'Replace != with <>'
    });
  }

  // Check for unbalanced parentheses
  const openParens = (sql.match(/\(/g) || []).length;
  const closeParens = (sql.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push({
      type: 'error',
      message: `Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`,
      suggestion: 'Check for missing or extra parentheses'
    });
  }

  // Check for unbalanced quotes (accounting for escaped quotes '')
  const sqlWithoutEscapedQuotes = sql.replace(/''/g, ''); // Remove escaped quotes
  const singleQuotes = (sqlWithoutEscapedQuotes.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    issues.push({
      type: 'error',
      message: 'Unbalanced single quotes',
      suggestion: 'Check for missing closing quote'
    });
  }

  // Check for ORDER BY with LIMIT but no explicit ordering
  if (/LIMIT\s+\d+/i.test(sql) && !/ORDER\s+BY/i.test(sql)) {
    issues.push({
      type: 'warning',
      message: 'LIMIT without ORDER BY returns non-deterministic results',
      suggestion: 'Add ORDER BY to ensure consistent results'
    });
  }

  // Check for implicit type conversion in comparisons
  if (/=\s*['"]?\d+['"]?/.test(sql) && /=\s*['"]/.test(sql)) {
    issues.push({
      type: 'info',
      message: 'Possible implicit type conversion in comparison',
      suggestion: 'Ensure data types match for optimal performance'
    });
  }

  // Check for missing table alias in JOINs
  const joinCount = (upperSQL.match(/JOIN/g) || []).length;
  if (joinCount > 0) {
    const hasAmbiguousColumns = /SELECT[^]*?(?<!\.)\b(?:id|name|created_at|updated_at)\b/i.test(sql);
    if (hasAmbiguousColumns && joinCount > 0) {
      issues.push({
        type: 'info',
        message: 'Consider using table aliases for column references in JOINs',
        suggestion: 'Prefix column names with table aliases (e.g., t.column_name)'
      });
    }
  }

  // Check for N+1 query patterns (subquery in SELECT)
  if (/SELECT[^]*?\(\s*SELECT/i.test(sql)) {
    issues.push({
      type: 'warning',
      message: 'Correlated subquery in SELECT may cause N+1 performance issues',
      suggestion: 'Consider using JOIN instead'
    });
  }

  // Check for functions on indexed columns in WHERE
  if (/WHERE[^]*?(?:LOWER|UPPER|DATE|YEAR|MONTH)\s*\(/i.test(sql)) {
    issues.push({
      type: 'warning',
      message: 'Function on column in WHERE clause prevents index usage',
      suggestion: 'Consider using expression indexes or refactoring the query'
    });
  }

  // Check for DISTINCT with ORDER BY (potential issue)
  if (/SELECT\s+DISTINCT/i.test(sql) && /ORDER\s+BY/i.test(sql)) {
    const orderByMatch = sql.match(/ORDER\s+BY\s+(\w+)/i);
    if (orderByMatch) {
      issues.push({
        type: 'info',
        message: 'Ensure ORDER BY columns are included in SELECT DISTINCT',
        suggestion: 'Columns in ORDER BY should appear in the SELECT list'
      });
    }
  }

  // Check for common typos
  const typos = [
    { wrong: /SLECT/gi, correct: 'SELECT' },
    { wrong: /FORM\s+/gi, correct: 'FROM ' },
    { wrong: /WEHRE/gi, correct: 'WHERE' },
    { wrong: /GRUOP/gi, correct: 'GROUP' },
    { wrong: /ODERR/gi, correct: 'ORDER' },
  ];

  typos.forEach(({ wrong, correct }) => {
    if (wrong.test(sql)) {
      issues.push({
        type: 'error',
        message: `Possible typo: did you mean ${correct}?`,
        suggestion: `Replace with ${correct}`
      });
    }
  });

  // Check for trailing comma before FROM
  if (/,\s*FROM/i.test(sql)) {
    issues.push({
      type: 'error',
      message: 'Trailing comma before FROM clause',
      suggestion: 'Remove the trailing comma'
    });
  }

  // Check for missing semicolon (for multiple statements)
  const statements = sql.trim().split(/;/).filter(s => s.trim());
  if (statements.length > 1 && !sql.trim().endsWith(';')) {
    issues.push({
      type: 'info',
      message: 'Consider ending the last statement with a semicolon',
      suggestion: 'Add ; at the end'
    });
  }

  return issues;
};

export const getLintSeverityColor = (type: LintIssue['type']): string => {
  switch (type) {
    case 'error':
      return 'text-red-500';
    case 'warning':
      return 'text-yellow-500';
    case 'info':
      return 'text-blue-500';
    default:
      return 'text-muted-foreground';
  }
};

export const getLintSeverityBgColor = (type: LintIssue['type']): string => {
  switch (type) {
    case 'error':
      return 'bg-red-500/10 border-red-500/30';
    case 'warning':
      return 'bg-yellow-500/10 border-yellow-500/30';
    case 'info':
      return 'bg-blue-500/10 border-blue-500/30';
    default:
      return 'bg-muted';
  }
};
