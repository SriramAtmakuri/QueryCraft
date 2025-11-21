import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { generateContent, extractJSON, extractJSONObject, extractJSONArray, getAvailableProvider } from './aiProvider';

dotenv.config();

// Log which AI provider is being used
const provider = getAvailableProvider();
if (provider) {
  console.log(`Using AI provider: ${provider.provider.toUpperCase()}`);
} else {
  console.warn('WARNING: No AI API key configured!');
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Provider Status - Check which provider is configured and test it
app.get('/api/ai-status', async (req, res) => {
    const providerConfig = getAvailableProvider();

    if (!providerConfig) {
        return res.json({
            configured: false,
            provider: null,
            status: 'error',
            message: 'No AI API key configured. Set GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY'
        });
    }

    try {
        // Test the API with a simple request
        const result = await generateContent({
            prompt: 'Reply with exactly: OK',
            temperature: 0,
            maxTokens: 10
        });

        res.json({
            configured: true,
            provider: providerConfig.provider,
            status: 'working',
            message: `${providerConfig.provider.toUpperCase()} API is working correctly`,
            testResponse: result.text.substring(0, 50)
        });
    } catch (error: any) {
        res.json({
            configured: true,
            provider: providerConfig.provider,
            status: 'error',
            message: error.message || 'API key validation failed',
            hint: 'Check if your API key is valid and has sufficient quota'
        });
    }
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

// Generate SQL from natural language
app.post('/api/generate-sql', async (req, res) => {
    try {
        const { prompt, schema, dialect = 'postgresql' } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const systemPrompt = `You are an expert SQL query generator. Generate optimized ${dialect.toUpperCase()} SQL queries based on user requests.

${schema ? `Database Schema:\n${schema}\n` : ''}

Rules:
- Return ONLY the SQL query, no explanations
- Use proper ${dialect} syntax
- Include appropriate JOINs when needed
- Add comments for complex queries
- Optimize for performance

User request: ${prompt}`;

        const result = await generateContent({
            prompt: systemPrompt,
            temperature: 0.3,
            maxTokens: 1024
        });

        // Clean up the response - remove markdown code blocks if present
        const cleanSQL = result.text.replace(/```sql\n?/gi, '').replace(/```\n?/gi, '').trim();

        res.json({ sql: cleanSQL });
    } catch (error: any) {
        console.error('Generate SQL error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate SQL' });
    }
});

// Explain SQL query
app.post('/api/explain-sql', async (req, res) => {
    try {
        const { sql } = req.body;

        if (!sql) {
            return res.status(400).json({ error: 'SQL query is required' });
        }

        const prompt = `Analyze and explain this SQL query in detail. Return ONLY a raw JSON object (no markdown, no code blocks) with this exact structure:
{
  "summary": "<one clear sentence describing what this query accomplishes>",
  "sections": [
    {
      "title": "<section name: SELECT Clause, FROM Clause, WHERE Conditions, JOINs, Subqueries, GROUP BY, ORDER BY, etc>",
      "explanation": "<detailed explanation of what this part does and why>",
      "columns": ["<columns involved, empty array if not applicable>"]
    }
  ],
  "result": "<describe the expected output: what rows/columns will be returned>",
  "tips": ["<helpful tips about performance, best practices, or potential issues>"]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown code blocks
- Always include at least 2-3 sections breaking down the query
- Provide meaningful explanations that help someone understand the query logic

SQL Query to explain:
${sql}`;

        const result = await generateContent({
            prompt,
            temperature: 0.3,
            maxTokens: 2048
        });

        const resultText = result.text;
        // Remove markdown code blocks if present
        const cleanedText = resultText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                // Try to fix common JSON issues
                let jsonStr = jsonMatch[0]
                    .replace(/,\s*}/g, '}')  // Remove trailing commas before }
                    .replace(/,\s*]/g, ']'); // Remove trailing commas before ]
                const explanation = JSON.parse(jsonStr);
                res.json(explanation);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                res.json({
                    summary: resultText.substring(0, 500),
                    sections: [],
                    result: '',
                    tips: ['Could not parse explanation details']
                });
            }
        } else {
            // Fallback to plain text
            res.json({
                summary: resultText.substring(0, 500),
                sections: [],
                result: '',
                tips: []
            });
        }
    } catch (error: any) {
        console.error('Explain SQL error:', error);
        res.status(500).json({ error: error.message || 'Failed to explain SQL' });
    }
});

// Convert SQL between dialects
app.post('/api/convert-sql', async (req, res) => {
    try {
        const { sql, fromDialect, toDialect } = req.body;

        if (!sql || !toDialect) {
            return res.status(400).json({ error: 'SQL and target dialect are required' });
        }

        const result = await generateContent({
            prompt: `Convert this ${fromDialect || 'SQL'} query to ${toDialect}. Return ONLY the converted SQL, no explanations:\n\n${sql}`,
            temperature: 0.2,
            maxTokens: 1024
        });

        const cleanSQL = result.text.replace(/```sql\n?/gi, '').replace(/```\n?/gi, '').trim();

        res.json({ sql: cleanSQL });
    } catch (error: any) {
        console.error('Convert SQL error:', error);
        res.status(500).json({ error: error.message || 'Failed to convert SQL' });
    }
});

// Optimize SQL query
app.post('/api/optimize-sql', async (req, res) => {
    try {
        const { sql, schema } = req.body;

        if (!sql) {
            return res.status(400).json({ error: 'SQL query is required' });
        }

        const prompt = `Analyze and optimize this SQL query for better performance. Return ONLY a raw JSON object (no markdown, no code blocks) with this structure:
{
  "optimizedQuery": "<the actual optimized SQL query code - must be valid SQL, not a description>",
  "improvements": [
    {
      "type": "<index|rewrite|hint|structure>",
      "description": "<what was improved>",
      "impact": "<high|medium|low>"
    }
  ],
  "indexes": [
    {
      "table": "<table name>",
      "columns": ["<column names>"],
      "sql": "<CREATE INDEX statement>",
      "reason": "<why this index helps>"
    }
  ],
  "tips": ["<performance tips>"],
  "summary": "<brief overall optimization summary>"
}

IMPORTANT:
- Return ONLY the JSON object, no markdown code blocks
- The "optimizedQuery" field MUST contain actual SQL code (SELECT, UPDATE, etc.), NOT a description or explanation
- If the query is already optimal, return the same query with minor formatting improvements

${schema ? `Schema:\n${schema}\n\n` : ''}Query:\n${sql}`;

        const result = await generateContent({
            prompt,
            temperature: 0.4,
            maxTokens: 2048
        });

        const resultText = result.text;
        // Remove markdown code blocks if present
        const cleanedText = resultText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                // Try to fix common JSON issues
                let jsonStr = jsonMatch[0]
                    .replace(/,\s*}/g, '}')  // Remove trailing commas before }
                    .replace(/,\s*]/g, ']'); // Remove trailing commas before ]
                const optimization = JSON.parse(jsonStr);
                res.json(optimization);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                // Try to extract optimized query from raw text
                const sqlMatch = resultText.match(/```sql\s*([\s\S]*?)```/i) ||
                                 resultText.match(/SELECT[\s\S]*?(?:;|$)/i);
                res.json({
                    optimizedQuery: sqlMatch ? sqlMatch[1] || sqlMatch[0] : '',
                    improvements: [],
                    indexes: [],
                    tips: ['Could not parse optimization details'],
                    summary: 'Optimization analysis completed with parsing issues'
                });
            }
        } else {
            // Fallback - try to extract SQL directly
            const sqlMatch = resultText.match(/```sql\s*([\s\S]*?)```/i) ||
                             resultText.match(/SELECT[\s\S]*?(?:;|$)/i);
            res.json({
                optimizedQuery: sqlMatch ? sqlMatch[1] || sqlMatch[0] : '',
                improvements: [],
                indexes: [],
                tips: [resultText.substring(0, 200)],
                summary: ''
            });
        }
    } catch (error: any) {
        console.error('Optimize SQL error:', error);
        res.status(500).json({ error: error.message || 'Failed to optimize SQL' });
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

// Gemini API - Extract schema from image (ERD diagram)
app.post('/api/image-to-schema', async (req, res) => {
    try {
        const { image } = req.body; // Base64 encoded image

        if (!image) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        // Extract base64 data and mime type
        const matches = image.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({ error: 'Invalid image format' });
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: base64Data
                                }
                            },
                            {
                                text: `Analyze this database diagram/ERD image and extract the schema. Generate complete PostgreSQL CREATE TABLE statements.

For each table you see:
1. Extract table name
2. Extract all columns with their data types
3. Identify primary keys
4. Identify foreign keys and relationships
5. Add appropriate constraints (NOT NULL, UNIQUE, etc.)

Return ONLY the SQL CREATE TABLE statements, no explanations. Include:
- Primary keys
- Foreign keys with ON DELETE/UPDATE actions
- Appropriate PostgreSQL data types
- NOT NULL constraints where visible
- Indexes for foreign keys

If the image is not a database diagram, return an error message.`
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.3,
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

        if (!cleanSchema || cleanSchema.toLowerCase().includes('not a database') || cleanSchema.toLowerCase().includes('cannot identify')) {
            return res.status(400).json({ error: 'Could not extract schema from this image. Please upload a database diagram or ERD.' });
        }

        res.json({ schema: cleanSchema });
    } catch (error) {
        console.error('Image to schema error:', error);
        res.status(500).json({ error: 'Failed to extract schema from image' });
    }
});

// Query autocomplete suggestions based on schema context
app.post('/api/query-suggestions', async (req, res) => {
    try {
        const { partialQuery, schema } = req.body;

        if (!partialQuery) {
            return res.status(400).json({ error: 'Partial query is required' });
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
                            text: `Given this partial natural language query, suggest 3-5 complete query descriptions that a user might want.

${schema ? `Database Schema:\n${schema}\n\n` : ''}
Partial query: "${partialQuery}"

Return a JSON array of suggestion objects with this structure:
{
  "text": "<complete query suggestion>",
  "description": "<brief explanation of what this query would do>"
}

Consider the schema context if provided. Suggestions should be practical, common database operations. Return ONLY the JSON array.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            console.error('Gemini API error:', data.error);
            return res.status(500).json({ error: data.error.message });
        }

        // Check if we got a valid response
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            console.error('Empty Gemini response:', JSON.stringify(data).substring(0, 500));
            return res.json({ suggestions: [] });
        }

        const resultText = data.candidates[0].content.parts[0].text;
        console.log('Suggestions raw response:', resultText.substring(0, 500));
        const cleanJson = resultText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        try {
            // Try to extract JSON array or object
            let suggestions;
            const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                // Clean up common JSON issues
                let jsonStr = arrayMatch[0]
                    .replace(/,\s*]/g, ']')  // Remove trailing commas
                    .replace(/,\s*}/g, '}');
                suggestions = JSON.parse(jsonStr);
            } else {
                // Try parsing as-is (might be wrapped in object)
                const parsed = JSON.parse(cleanJson);
                suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || [];
            }
            console.log('Parsed suggestions count:', Array.isArray(suggestions) ? suggestions.length : 0);
            res.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] });
        } catch (parseError) {
            console.error('Suggestions parse error:', parseError);
            console.error('Clean JSON was:', cleanJson.substring(0, 300));
            res.json({ suggestions: [] });
        }
    } catch (error) {
        console.error('Query suggestions error:', error);
        res.status(500).json({ error: 'Failed to generate suggestions' });
    }
});

// Multi-query support - Generate multiple SQL statements from natural language
app.post('/api/generate-multi-sql', async (req, res) => {
    try {
        const { prompt, schema, dialect = 'postgresql' } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
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
                            text: `Generate multiple ${dialect.toUpperCase()} SQL queries based on this request. The request may contain multiple operations or a complex workflow.

Return a JSON array where each element has this structure:
{
  "description": "<brief description of what this query does>",
  "sql": "<the SQL statement>",
  "order": <execution order number starting from 1>,
  "dependencies": [<array of order numbers this query depends on, empty if none>]
}

${schema ? `Database Schema:\n${schema}\n\n` : ''}
Request: ${prompt}

Return ONLY the JSON array, no markdown or explanations. Ensure queries are in the correct execution order for transactions, CTEs, or dependent operations.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 4096
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = resultText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

        try {
            const queries = JSON.parse(cleanJson);
            res.json({ queries });
        } catch {
            // If JSON parsing fails, return as single query
            res.json({
                queries: [{
                    description: 'Generated query',
                    sql: cleanJson,
                    order: 1,
                    dependencies: []
                }]
            });
        }
    } catch (error) {
        console.error('Multi-query generation error:', error);
        res.status(500).json({ error: 'Failed to generate queries' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
