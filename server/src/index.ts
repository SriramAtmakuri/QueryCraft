import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic User Routes
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Gemini API - Generate SQL from natural language
app.post('/api/generate-sql', async (req, res) => {
    try {
        const { prompt, schema, dialect = 'postgresql' } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const systemPrompt = `You are an expert SQL query generator. Generate optimized ${dialect.toUpperCase()} SQL queries based on user requests.

${schema ? `Database Schema:\n${schema}\n` : ''}

Rules:
- Return ONLY the SQL query, no explanations
- Use proper ${dialect} syntax
- Include appropriate JOINs when needed
- Add comments for complex queries
- Optimize for performance`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${systemPrompt}\n\nUser request: ${prompt}` }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const sql = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        // Clean up the response - remove markdown code blocks if present
        const cleanSQL = sql.replace(/```sql\n?/gi, '').replace(/```\n?/gi, '').trim();

        res.json({ sql: cleanSQL });
    } catch (error) {
        console.error('Generate SQL error:', error);
        res.status(500).json({ error: 'Failed to generate SQL' });
    }
});

// Gemini API - Explain SQL query
app.post('/api/explain-sql', async (req, res) => {
    try {
        const { sql } = req.body;

        if (!sql) {
            return res.status(400).json({ error: 'SQL query is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Explain this SQL query in a structured format. Return a JSON object with this structure:
{
  "summary": "<one sentence summary of what the query does>",
  "sections": [
    {
      "title": "<section name like 'SELECT Clause', 'FROM Clause', 'WHERE Conditions', 'JOINs', 'GROUP BY', 'ORDER BY', etc>",
      "explanation": "<clear explanation of this part>",
      "columns": ["<list of columns involved if applicable>"]
    }
  ],
  "result": "<description of what the result set will contain>",
  "tips": ["<optional tips or best practices>"]
}

Query to explain:
${sql}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.5,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const explanation = JSON.parse(jsonMatch[0]);
            res.json(explanation);
        } else {
            // Fallback to plain text
            res.json({ summary: resultText, sections: [], result: '', tips: [] });
        }
    } catch (error) {
        console.error('Explain SQL error:', error);
        res.status(500).json({ error: 'Failed to explain SQL' });
    }
});

// Gemini API - Convert SQL between dialects
app.post('/api/convert-sql', async (req, res) => {
    try {
        const { sql, fromDialect, toDialect } = req.body;

        if (!sql || !toDialect) {
            return res.status(400).json({ error: 'SQL and target dialect are required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Convert this ${fromDialect || 'SQL'} query to ${toDialect}. Return ONLY the converted SQL, no explanations:\n\n${sql}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const converted = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanSQL = converted.replace(/```sql\n?/gi, '').replace(/```\n?/gi, '').trim();

        res.json({ sql: cleanSQL });
    } catch (error) {
        console.error('Convert SQL error:', error);
        res.status(500).json({ error: 'Failed to convert SQL' });
    }
});

// Gemini API - Optimize SQL query
app.post('/api/optimize-sql', async (req, res) => {
    try {
        const { sql, schema } = req.body;

        if (!sql) {
            return res.status(400).json({ error: 'SQL query is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Analyze and optimize this SQL query. Provide:
1. The optimized query
2. List of suggested indexes
3. Performance tips

${schema ? `Schema:\n${schema}\n\n` : ''}Query:\n${sql}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 2048
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const optimization = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ optimization });
    } catch (error) {
        console.error('Optimize SQL error:', error);
        res.status(500).json({ error: 'Failed to optimize SQL' });
    }
});

// Gemini API - Generate natural language from SQL (reverse engineering)
app.post('/api/sql-to-natural', async (req, res) => {
    try {
        const { sql } = req.body;

        if (!sql) {
            return res.status(400).json({ error: 'SQL query is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Convert this SQL query to a natural language description. Describe what data it retrieves in simple terms:\n\n${sql}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.5,
                        maxOutputTokens: 512
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const description = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ description });
    } catch (error) {
        console.error('SQL to natural error:', error);
        res.status(500).json({ error: 'Failed to convert SQL to natural language' });
    }
});

// Gemini API - Generate mock results for SQL query
app.post('/api/mock-results', async (req, res) => {
    try {
        const { sql } = req.body;

        if (!sql) {
            return res.status(400).json({ error: 'SQL query is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Generate realistic mock data for this SQL query. Return ONLY a JSON object with this exact structure:
{
  "columns": ["column1", "column2", ...],
  "rows": [
    ["value1", "value2", ...],
    ["value1", "value2", ...],
    ...
  ]
}

Generate 5-10 rows of realistic sample data based on the query columns. Use realistic names, emails, dates, numbers etc.

SQL Query:
${sql}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON from response
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const mockData = JSON.parse(jsonMatch[0]);
            res.json(mockData);
        } else {
            res.status(500).json({ error: 'Failed to parse mock results' });
        }
    } catch (error) {
        console.error('Mock results error:', error);
        res.status(500).json({ error: 'Failed to generate mock results' });
    }
});

// Gemini API - Analyze query performance (simulated EXPLAIN ANALYZE)
app.post('/api/analyze-performance', async (req, res) => {
    try {
        const { sql, schema } = req.body;

        if (!sql) {
            return res.status(400).json({ error: 'SQL query is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Analyze this SQL query and provide a simulated execution plan analysis. Return a JSON object with this structure:
{
  "estimatedCost": <number 1-100>,
  "estimatedRows": <number>,
  "executionTime": "<estimated time like '15ms' or '2.3s'>",
  "operations": [
    {
      "type": "<Seq Scan|Index Scan|Hash Join|Nested Loop|Sort|Aggregate|etc>",
      "table": "<table name or null>",
      "cost": <number>,
      "rows": <number>,
      "description": "<what this operation does>",
      "warning": "<potential issue or null>"
    }
  ],
  "suggestions": [
    {
      "type": "<index|rewrite|statistics>",
      "priority": "<high|medium|low>",
      "description": "<suggestion text>",
      "sql": "<CREATE INDEX or optimized query if applicable>"
    }
  ],
  "summary": "<overall performance assessment>"
}

${schema ? `Schema:\n${schema}\n\n` : ''}Query:\n${sql}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2048
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            res.json(analysis);
        } else {
            res.status(500).json({ error: 'Failed to parse performance analysis' });
        }
    } catch (error) {
        console.error('Performance analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze performance' });
    }
});

// Gemini API - Debug SQL query errors
app.post('/api/debug-sql', async (req, res) => {
    try {
        const { sql, error: sqlError, schema } = req.body;

        if (!sql || !sqlError) {
            return res.status(400).json({ error: 'SQL query and error message are required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Debug this SQL query error. Analyze the error, explain what's wrong, and provide the corrected query.

Return a JSON object with this structure:
{
  "errorType": "<syntax|type_mismatch|constraint|reference|permission|other>",
  "explanation": "<clear explanation of what went wrong>",
  "location": "<specific part of query with the issue>",
  "fixedQuery": "<corrected SQL query>",
  "prevention": "<tip to avoid this error in future>"
}

${schema ? `Schema:\n${schema}\n\n` : ''}Query:\n${sql}

Error Message:\n${sqlError}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const debug = JSON.parse(jsonMatch[0]);
            res.json(debug);
        } else {
            res.status(500).json({ error: 'Failed to parse debug response' });
        }
    } catch (error) {
        console.error('Debug SQL error:', error);
        res.status(500).json({ error: 'Failed to debug SQL' });
    }
});

// Gemini API - Generate schema from natural language
app.post('/api/generate-schema', async (req, res) => {
    try {
        const { description } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Generate a complete PostgreSQL database schema based on this description. Include all necessary tables, relationships, indexes, and constraints.

Return the complete CREATE TABLE statements with:
- Primary keys
- Foreign keys with ON DELETE/UPDATE actions
- Appropriate data types
- NOT NULL constraints where needed
- Default values where appropriate
- Useful indexes for common queries
- Comments explaining the purpose

Description: ${description}

Return ONLY the SQL statements, no explanations.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 4096
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const schema = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanSchema = schema.replace(/```sql\n?/gi, '').replace(/```\n?/gi, '').trim();

        res.json({ schema: cleanSchema });
    } catch (error) {
        console.error('Generate schema error:', error);
        res.status(500).json({ error: 'Failed to generate schema' });
    }
});

// Gemini API - Export SQL to ORM code
app.post('/api/export-orm', async (req, res) => {
    try {
        const { sql, orm } = req.body;

        if (!sql || !orm) {
            return res.status(400).json({ error: 'SQL and ORM type are required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const ormInstructions: Record<string, string> = {
            prisma: 'Prisma Client query using findMany, create, update, delete, etc.',
            typeorm: 'TypeORM query using QueryBuilder or Repository methods',
            sequelize: 'Sequelize query using findAll, create, update, destroy, etc.',
            drizzle: 'Drizzle ORM query using select, insert, update, delete',
            knex: 'Knex.js query builder syntax'
        };

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Convert this SQL query to ${ormInstructions[orm] || orm} code. Return ONLY the code, no explanations. Include necessary imports if applicable.

SQL Query:
${sql}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanCode = code.replace(/```\w*\n?/gi, '').replace(/```\n?/gi, '').trim();

        res.json({ code: cleanCode });
    } catch (error) {
        console.error('Export ORM error:', error);
        res.status(500).json({ error: 'Failed to export to ORM' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
