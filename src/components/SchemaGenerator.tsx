import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Database, Copy, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useSchema } from '@/context/SchemaContext';

export const SchemaGenerator = () => {
  const [description, setDescription] = useState('');
  const [generatedSchema, setGeneratedSchema] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { setSchemaText } = useSchema();

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Please describe your database needs');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await api.generateSchema(description);
      setGeneratedSchema(result.schema);
      toast.success('Schema generated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate schema');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSchema);
    toast.success('Schema copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([generatedSchema], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.sql';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Schema downloaded');
  };

  const handleApplyToBuilder = () => {
    setSchemaText(generatedSchema);
    toast.success('Schema applied to builder');
  };

  const examples = [
    'E-commerce platform with users, products, orders, and reviews',
    'Food delivery app with restaurants, menus, orders, and drivers',
    'Project management tool with teams, projects, tasks, and comments',
    'Social media app with users, posts, comments, likes, and follows',
    'Online learning platform with courses, lessons, students, and progress tracking'
  ];

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Database className="w-4 h-4" />
        AI Schema Generator
      </h3>

      <div className="space-y-3">
        <Textarea
          placeholder="Describe the database you need...&#10;&#10;Example: I need a database for a food delivery app with restaurants, menus, customers, orders, delivery drivers, and ratings"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[120px]"
        />

        <div className="flex flex-wrap gap-1">
          {examples.map((example, idx) => (
            <button
              key={idx}
              onClick={() => setDescription(example)}
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/70 transition-colors truncate max-w-[200px]"
              title={example}
            >
              {example.split(' with ')[0]}
            </button>
          ))}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!description.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Database className="w-4 h-4 mr-2" />
          )}
          Generate Schema
        </Button>

        {generatedSchema && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Generated Schema</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="w-3 h-3" />
                </Button>
                <Button variant="secondary" size="sm" onClick={handleApplyToBuilder}>
                  Apply
                </Button>
              </div>
            </div>
            <div className="code-bg rounded-lg p-3 max-h-[300px] overflow-auto">
              <pre className="text-xs font-mono">
                {generatedSchema}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
