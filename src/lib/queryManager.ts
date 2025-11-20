// Query History & Bookmarks Management

export interface QueryHistoryItem {
  id: string;
  prompt: string;
  sql: string;
  dialect: string;
  timestamp: number;
  isBookmarked: boolean;
}

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  prompt: string;
}

// Query Templates
export const queryTemplates: QueryTemplate[] = [
  // Pagination
  {
    id: 'pagination-offset',
    name: 'Pagination with Offset',
    description: 'Basic pagination using LIMIT and OFFSET',
    category: 'Pagination',
    prompt: 'Get page 2 of users with 10 items per page',
  },
  {
    id: 'pagination-cursor',
    name: 'Cursor-based Pagination',
    description: 'Efficient pagination using cursor/keyset',
    category: 'Pagination',
    prompt: 'Get next 10 users after user ID 100 ordered by created_at',
  },
  // Search
  {
    id: 'search-like',
    name: 'Text Search (LIKE)',
    description: 'Basic text search with wildcards',
    category: 'Search',
    prompt: 'Search products where name contains "phone"',
  },
  {
    id: 'search-fulltext',
    name: 'Full-text Search',
    description: 'Advanced full-text search',
    category: 'Search',
    prompt: 'Full-text search for "wireless headphones" in product name and description',
  },
  // Aggregation
  {
    id: 'agg-count-group',
    name: 'Count with Group By',
    description: 'Count records grouped by category',
    category: 'Aggregation',
    prompt: 'Count orders by status',
  },
  {
    id: 'agg-sum-avg',
    name: 'Sum and Average',
    description: 'Calculate totals and averages',
    category: 'Aggregation',
    prompt: 'Get total and average order amount per customer',
  },
  {
    id: 'agg-top-n',
    name: 'Top N Results',
    description: 'Get top performers',
    category: 'Aggregation',
    prompt: 'Get top 5 customers by total purchases',
  },
  // Joins
  {
    id: 'join-inner',
    name: 'Inner Join',
    description: 'Combine related tables',
    category: 'Joins',
    prompt: 'Get all orders with customer name and product details',
  },
  {
    id: 'join-left',
    name: 'Left Join with NULL check',
    description: 'Find records without matches',
    category: 'Joins',
    prompt: 'Find all customers who have never placed an order',
  },
  // Date/Time
  {
    id: 'date-range',
    name: 'Date Range Filter',
    description: 'Filter by date period',
    category: 'Date/Time',
    prompt: 'Get all orders from last 30 days',
  },
  {
    id: 'date-group',
    name: 'Group by Date Period',
    description: 'Aggregate by time period',
    category: 'Date/Time',
    prompt: 'Get monthly sales totals for this year',
  },
  // Subqueries
  {
    id: 'subquery-in',
    name: 'Subquery with IN',
    description: 'Filter using subquery results',
    category: 'Subqueries',
    prompt: 'Get products that have been ordered more than 10 times',
  },
  {
    id: 'subquery-exists',
    name: 'EXISTS Subquery',
    description: 'Check for existence',
    category: 'Subqueries',
    prompt: 'Find users who have at least one order over $100',
  },
  // Analytics
  {
    id: 'analytics-running',
    name: 'Running Total',
    description: 'Calculate cumulative sum',
    category: 'Analytics',
    prompt: 'Calculate running total of sales by date',
  },
  {
    id: 'analytics-rank',
    name: 'Ranking',
    description: 'Rank records within groups',
    category: 'Analytics',
    prompt: 'Rank products by sales within each category',
  },
];

// Storage keys
const HISTORY_KEY = 'querycraft_history';
const BOOKMARKS_KEY = 'querycraft_bookmarks';

// Generate unique ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// History Management
export const getQueryHistory = (): QueryHistoryItem[] => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addToHistory = (prompt: string, sql: string, dialect: string): QueryHistoryItem => {
  const history = getQueryHistory();
  const newItem: QueryHistoryItem = {
    id: generateId(),
    prompt,
    sql,
    dialect,
    timestamp: Date.now(),
    isBookmarked: false,
  };

  // Keep only last 50 items
  const updatedHistory = [newItem, ...history].slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));

  return newItem;
};

export const clearHistory = (): void => {
  const history = getQueryHistory();
  // Keep only bookmarked items
  const bookmarked = history.filter(item => item.isBookmarked);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(bookmarked));
};

export const deleteHistoryItem = (id: string): void => {
  const history = getQueryHistory();
  const updated = history.filter(item => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};

// Bookmark Management
export const toggleBookmark = (id: string): boolean => {
  const history = getQueryHistory();
  const item = history.find(h => h.id === id);
  if (item) {
    item.isBookmarked = !item.isBookmarked;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return item.isBookmarked;
  }
  return false;
};

export const getBookmarks = (): QueryHistoryItem[] => {
  return getQueryHistory().filter(item => item.isBookmarked);
};

// SQL Formatting
export const formatSQL = (sql: string): string => {
  // Keywords to capitalize and add newlines before
  const majorKeywords = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
    'OUTER JOIN', 'FULL JOIN', 'CROSS JOIN', 'ON', 'AND', 'OR', 'ORDER BY',
    'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'EXCEPT', 'INTERSECT',
    'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE',
    'ALTER TABLE', 'DROP TABLE', 'WITH', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
  ];

  let formatted = sql.trim();

  // Normalize whitespace
  formatted = formatted.replace(/\s+/g, ' ');

  // Add newlines before major keywords
  majorKeywords.forEach(keyword => {
    const regex = new RegExp(`\\s+${keyword}\\s+`, 'gi');
    formatted = formatted.replace(regex, `\n${keyword} `);
  });

  // Capitalize keywords
  majorKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    formatted = formatted.replace(regex, keyword);
  });

  // Handle commas in SELECT
  formatted = formatted.replace(/,\s*/g, ',\n  ');

  // Clean up first line
  formatted = formatted.replace(/^\n/, '');

  // Indent after SELECT, FROM, WHERE, etc.
  const lines = formatted.split('\n');
  const indentedLines = lines.map((line, index) => {
    const trimmed = line.trim();
    if (index === 0) return trimmed;

    // Check if line starts with a major keyword
    const startsWithKeyword = majorKeywords.some(kw =>
      trimmed.toUpperCase().startsWith(kw)
    );

    if (startsWithKeyword) {
      return trimmed;
    }
    return '  ' + trimmed;
  });

  return indentedLines.join('\n');
};

// Date formatting for display
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

// Get template categories
export const getTemplateCategories = (): string[] => {
  const categories = new Set(queryTemplates.map(t => t.category));
  return Array.from(categories);
};

// Get templates by category
export const getTemplatesByCategory = (category: string): QueryTemplate[] => {
  return queryTemplates.filter(t => t.category === category);
};
