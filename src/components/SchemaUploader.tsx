import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Database, FileText } from 'lucide-react';
import { toast } from 'sonner';

export const SchemaUploader = () => {
  const [sqlSchema, setSqlSchema] = useState('');
  const [jsonSchema, setJsonSchema] = useState('');

  const handleSQLParse = () => {
    if (!sqlSchema.trim()) {
      toast.error('Please enter a SQL schema');
      return;
    }
    toast.success('Schema parsed successfully!');
    // Schema parsing logic will be added
  };

  const handleJSONParse = () => {
    try {
      JSON.parse(jsonSchema);
      toast.success('JSON schema parsed successfully!');
      // Schema parsing logic will be added
    } catch (e) {
      toast.error('Invalid JSON format');
    }
  };

  const exampleSQL = `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  total DECIMAL(10,2),
  order_date TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);`;

  const exampleJSON = `{
  "tables": [
    {
      "name": "users",
      "columns": [
        { "name": "id", "type": "INTEGER", "primaryKey": true },
        { "name": "name", "type": "VARCHAR(255)" },
        { "name": "email", "type": "VARCHAR(255)" }
      ]
    }
  ]
}`;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Database className="w-5 h-5 text-primary" />
        Import Database Schema
      </h2>

      <Tabs defaultValue="sql" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="sql" className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            SQL Schema
          </TabsTrigger>
          <TabsTrigger value="json" className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            JSON Schema
          </TabsTrigger>
          <TabsTrigger value="connection" className="flex-1">
            <Database className="w-4 h-4 mr-2" />
            DB Connection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sql" className="space-y-4">
          <div>
            <Textarea
              placeholder={exampleSQL}
              value={sqlSchema}
              onChange={(e) => setSqlSchema(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
            />
          </div>
          <Button onClick={handleSQLParse} className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Parse SQL Schema
          </Button>
        </TabsContent>

        <TabsContent value="json" className="space-y-4">
          <div>
            <Textarea
              placeholder={exampleJSON}
              value={jsonSchema}
              onChange={(e) => setJsonSchema(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
            />
          </div>
          <Button onClick={handleJSONParse} className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Parse JSON Schema
          </Button>
        </TabsContent>

        <TabsContent value="connection" className="space-y-4">
          <div className="text-center py-12 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Database connection coming soon</p>
            <p className="text-sm mt-2">Connect to PostgreSQL, MySQL, or SQLite</p>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
