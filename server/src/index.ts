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
                            text: `Explain this SQL query in simple terms. Break down what each part does and what the result will be:\n\n${sql}`
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

        const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ explanation });
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
