const API_BASE = import.meta.env.VITE_API_URL || 'https://querycraft-uaqy.onrender.com';

export const api = {
  async generateSQL(prompt: string, schema?: string, dialect: string = 'postgresql') {
    const response = await fetch(`${API_BASE}/api/generate-sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, schema, dialect })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate SQL');
    }

    return response.json();
  },

  async explainSQL(sql: string) {
    const response = await fetch(`${API_BASE}/api/explain-sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to explain SQL');
    }

    return response.json();
  },

  async convertSQL(sql: string, fromDialect: string, toDialect: string) {
    const response = await fetch(`${API_BASE}/api/convert-sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, fromDialect, toDialect })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to convert SQL');
    }

    return response.json();
  },

  async optimizeSQL(sql: string, schema?: string) {
    const response = await fetch(`${API_BASE}/api/optimize-sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, schema })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to optimize SQL');
    }

    return response.json();
  },

  async sqlToNatural(sql: string) {
    const response = await fetch(`${API_BASE}/api/sql-to-natural`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to convert to natural language');
    }

    return response.json();
  },

  async getMockResults(sql: string) {
    const response = await fetch(`${API_BASE}/api/mock-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate mock results');
    }

    return response.json();
  },

  async exportORM(sql: string, orm: string) {
    const response = await fetch(`${API_BASE}/api/export-orm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, orm })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export to ORM');
    }

    return response.json();
  }
};
