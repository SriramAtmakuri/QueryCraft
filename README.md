# QueryCraft

> AI-Powered SQL Query Builder with Natural Language Processing

QueryCraft is a modern web application that transforms natural language into optimized SQL queries using AI. It provides a comprehensive suite of tools for database developers, analysts, and anyone working with SQL databases.

**Live Demo**: [https://querycraft-app.web.app](https://querycraft-app.web.app)

## 🌟 Features

### Core Capabilities

#### 🤖 AI-Powered Query Generation
- Convert plain English descriptions into optimized SQL queries
- Support for complex queries including joins, subqueries, and aggregations
- Multi-dialect support (PostgreSQL, MySQL, SQLite, MongoDB)
- Intelligent query suggestions based on schema context

#### 📊 Visual Query Builder
- Drag-and-drop interface for building queries
- Interactive table and column selection
- Visual join configuration
- Real-time query preview

#### 🔍 SQL Analysis & Optimization
- **Query Explanation**: Detailed breakdown of SQL queries with section-by-section analysis
- **Performance Optimization**: AI-powered suggestions for query improvements
- **SQL Linting**: Real-time syntax checking and best practice recommendations
- **Query Debugging**: Intelligent error detection and fix suggestions

#### 🔄 Dialect Conversion
- Convert SQL between different database dialects
- Support for PostgreSQL, MySQL, SQLite, and MongoDB
- Side-by-side diff view with syntax highlighting
- Preserve query logic while adapting to target dialect syntax

#### 📝 Schema Management
- **Schema Upload**: Import schema from SQL, JSON, or image files
- **Schema Generator**: Create sample schemas with AI assistance
- **Schema Visualizer**: Auto-generate ER diagrams from database structures
- **Template Library**: Pre-built schemas for common use cases (e-commerce, social media, etc.)

#### 🎨 Export Options
Generate queries for multiple ORMs and frameworks:
- Prisma
- TypeORM
- Sequelize
- Drizzle ORM
- Knex.js
- Raw SQL

### Advanced Features

#### 📈 Performance Analysis
- Simulated execution plan analysis
- Index recommendations
- Query cost estimation
- Performance bottleneck detection

#### 🧪 Mock Data Generation
- AI-generated realistic sample data based on query structure
- Customizable data volume
- Type-aware data generation

#### 📚 Query History
- Search and filter previous queries
- Save favorite queries
- Export query history

#### 🔗 Multi-Query Support
- Execute multiple related queries
- Dependency tracking
- Transaction support

#### 🎯 Query Sharing
- Generate shareable links for queries
- Embed queries in documentation
- Export as gists

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS
- **Syntax Highlighting**: prism-react-renderer
- **State Management**: React Query
- **Routing**: React Router

### Backend
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database**: Prisma ORM + SQLite
- **AI Integration**: Multi-provider support (Gemini, OpenAI, Anthropic, Groq)

### Deployment
- **Frontend**: Firebase Hosting
- **Backend**: Render
- **CI/CD**: Firebase CLI

## 🔧 Configuration

### API Endpoints

The backend exposes the following key endpoints:

- `POST /api/generate-sql` - Generate SQL from natural language
- `POST /api/explain-sql` - Get detailed query explanation
- `POST /api/optimize-sql` - Optimize query performance
- `POST /api/convert-sql` - Convert between SQL dialects
- `POST /api/mock-results` - Generate sample data
- `POST /api/analyze-performance` - Analyze query performance
- `POST /api/debug-sql` - Debug SQL errors
- `GET /api/ai-status` - Check AI provider status

## 🎯 Usage Examples

### Generate SQL Query
```
Natural Language: "Find all customers who haven't ordered in the last 90 days"

Generated SQL:
SELECT c.customer_id, c.name
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_date < NOW() - INTERVAL '90 days'
   OR o.order_id IS NULL;
```

### Convert SQL Dialect
```
From PostgreSQL:
SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days';

To MySQL:
SELECT * FROM users WHERE created_at > NOW() - INTERVAL 7 DAY;
```

### Optimize Query
```
Original:
SELECT * FROM orders WHERE user_id IN (SELECT id FROM users);

Optimized:
SELECT o.* FROM orders o
WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = o.user_id);
```

## 🚀 Why QueryCraft?

QueryCraft bridges the gap between natural language and database queries, making SQL accessible to everyone while providing powerful tools for experienced developers. Whether you're:

- **Learning SQL** - Understand how queries work with AI-powered explanations
- **Building Applications** - Generate optimized queries quickly with multi-ORM export
- **Optimizing Performance** - Get AI-driven insights on query improvements
- **Working Across Databases** - Seamlessly convert between different SQL dialects
- **Documenting Systems** - Visualize schemas and share queries with your team

QueryCraft accelerates your workflow while helping you write better, faster SQL.


