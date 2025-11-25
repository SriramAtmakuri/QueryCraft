const API_BASE = import.meta.env.VITE_API_URL || 'https://querycraft-uaqy.onrender.com';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('querycraft_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res;
}

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
  },

  async analyzePerformance(sql: string, schema?: string) {
    const response = await fetch(`${API_BASE}/api/analyze-performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, schema })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze performance');
    }

    return response.json();
  },

  async debugSQL(sql: string, error: string, schema?: string) {
    const response = await fetch(`${API_BASE}/api/debug-sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, error, schema })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to debug SQL');
    }

    return response.json();
  },

  async generateSchema(description: string) {
    const response = await fetch(`${API_BASE}/api/generate-schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate schema');
    }

    return response.json();
  },

  async imageToSchema(imageBase64: string) {
    const response = await fetch(`${API_BASE}/api/image-to-schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract schema from image');
    }

    return response.json();
  },

  async generateMultiSQL(prompt: string, schema?: string, dialect: string = 'postgresql') {
    const response = await fetch(`${API_BASE}/api/generate-multi-sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, schema, dialect })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate multi-query');
    }

    return response.json();
  },

  async getQuerySuggestions(partialQuery: string, schema?: string) {
    const response = await fetch(`${API_BASE}/api/query-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partialQuery, schema })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get suggestions');
    }

    return response.json();
  },

  // Query history (requires auth)
  async getHistory(page = 1, limit = 20) {
    return (await apiFetch(`${API_BASE}/api/history?page=${page}&limit=${limit}`)).json();
  },

  async addHistory(prompt: string, sql: string, dialect: string) {
    return (await apiFetch(`${API_BASE}/api/history`, {
      method: 'POST',
      body: JSON.stringify({ prompt, sql, dialect })
    })).json();
  },

  async deleteHistoryItem(id: string) {
    await apiFetch(`${API_BASE}/api/history/${id}`, { method: 'DELETE' });
  },

  async clearHistory() {
    await apiFetch(`${API_BASE}/api/history`, { method: 'DELETE' });
  },

  // Saved queries (requires auth)
  async getSavedQueries() {
    return (await apiFetch(`${API_BASE}/api/history/saved`)).json();
  },

  async saveQuery(name: string, sqlQuery: string, visualizationConfig?: string) {
    return (await apiFetch(`${API_BASE}/api/history/saved`, {
      method: 'POST',
      body: JSON.stringify({ name, sqlQuery, visualizationConfig })
    })).json();
  },

  async updateSavedQuery(id: string, name: string, sqlQuery: string, visualizationConfig?: string) {
    return (await apiFetch(`${API_BASE}/api/history/saved/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, sqlQuery, visualizationConfig })
    })).json();
  },

  async deleteSavedQuery(id: string) {
    await apiFetch(`${API_BASE}/api/history/saved/${id}`, { method: 'DELETE' });
  },

  // Semantic diff
  async semanticDiff(sql1: string, sql2: string, dialect = 'postgresql') {
    return (await fetch(`${API_BASE}/api/advanced/semantic-diff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql1, sql2, dialect }),
    }).then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); })));
  },

  // Schema drift detection
  async schemaDrift(schema: string, queries: string[], dialect = 'postgresql') {
    return (await fetch(`${API_BASE}/api/advanced/schema-drift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema, queries, dialect }),
    }).then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); })));
  },

  // Migration inference from query patterns
  async inferMigrations(schema: string, queries: string[], dialect = 'postgresql') {
    return (await fetch(`${API_BASE}/api/advanced/infer-migrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema, queries, dialect }),
    }).then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); })));
  },

  // Cross-dialect cost estimation
  async dialectCost(sql: string, schema?: string, dialects = ['postgresql', 'mysql', 'sqlite', 'sqlserver']) {
    return (await fetch(`${API_BASE}/api/advanced/dialect-cost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, schema, dialects }),
    }).then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); })));
  },

  // Collaborative reviews — create persistent share
  async createShare(sql: string, query?: string, dialect = 'postgresql', schema?: string) {
    return (await fetch(`${API_BASE}/api/reviews/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, query, dialect, schema }),
    }).then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); })));
  },

  async getShare(shareId: string) {
    return (await fetch(`${API_BASE}/api/reviews/share/${shareId}`).then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); })));
  },

  async getReviews(shareId: string) {
    return (await fetch(`${API_BASE}/api/reviews/${shareId}`).then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); })));
  },

  async addReview(shareId: string, lineStart: number, lineEnd: number, comment: string, author = 'Anonymous') {
    return (await fetch(`${API_BASE}/api/reviews/${shareId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineStart, lineEnd, comment, author }),
    }).then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); })));
  },

  async deleteReview(commentId: string) {
    await fetch(`${API_BASE}/api/reviews/comments/${commentId}`, { method: 'DELETE' });
  },
};
