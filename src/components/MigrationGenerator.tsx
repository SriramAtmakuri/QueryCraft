import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, GitMerge, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { getQueryHistory } from '@/lib/queryManager';

interface MigrationGeneratorProps {
  schema: string;
  dialect?: string;
}

interface Migration {
  description: string;
  type: string;
  sql: string;
  risk: 'low' | 'medium' | 'high';
  reason: string;
  reverseSql?: string;
}

interface MigrationResult {
  migrations: Migration[];
  summary: string;
}

const TYPE_LABELS: Record<string, string> = {
  add_index: 'Index',
  add_foreign_key: 'Foreign Key',
  add_column: 'Column',
  add_constraint: 'Constraint',
  create_table: 'New Table',
  other: 'Other',
};

export const MigrationGenerator = ({ schema, dialect = 'postgresql' }: MigrationGeneratorProps) => {
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if (!schema.trim()) {
      toast.error('Paste a schema first');
      return;
    }
    const history = getQueryHistory();
    if (history.length === 0) {
      toast.error('No query history — generate some queries first');
      return;
    }
    setIsGenerating(true);
    try {
      const queries = history.map(h => h.sql);
      const data = await api.inferMigrations(schema, queries, dialect);
      setResult(data);
      toast.success(`${data.migrations?.length ?? 0} migrations inferred`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleExpand = (i: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  };

  const riskBadge = (risk: string) => {
    if (risk === 'high') return <Badge variant="destructive">High Risk</Badge>;
    if (risk === 'medium') return <Badge variant="secondary">Medium Risk</Badge>;
    return <Badge variant="outline">Low Risk</Badge>;
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-primary" />
            Migration Inference
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Infers missing indexes, FK, and columns from your query patterns
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerate}
          disabled={isGenerating || !schema.trim()}
        >
          {isGenerating ? (
            <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
          ) : (
            <GitMerge className="w-3 h-3 mr-2" />
          )}
          {isGenerating ? 'Inferring...' : 'Infer Migrations'}
        </Button>
      </div>

      {result && (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3 pr-2">
            {result.summary && (
              <div className="bg-muted rounded-md p-3">
                <p className="text-xs text-muted-foreground">{result.summary}</p>
              </div>
            )}

            {result.migrations?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No migrations needed — schema looks well-optimized for your query patterns.
              </p>
            )}

            {result.migrations?.map((m, i) => (
              <div key={i} className="border border-border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(i)}
                >
                  <div className="flex items-center gap-2 text-left flex-1">
                    {riskBadge(m.risk)}
                    <Badge variant="outline" className="text-xs">{TYPE_LABELS[m.type] ?? m.type}</Badge>
                    <span className="text-sm font-medium">{m.description}</span>
                  </div>
                  {expanded.has(i) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {expanded.has(i) && (
                  <div className="border-t border-border p-3 space-y-3 bg-card">
                    <p className="text-xs text-muted-foreground">{m.reason}</p>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold">Migration SQL</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(m.sql);
                            toast.success('Copied');
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <pre className="text-xs font-mono bg-muted rounded px-3 py-2 overflow-x-auto">{m.sql}</pre>
                    </div>

                    {m.reverseSql && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-muted-foreground">Rollback SQL</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(m.reverseSql!);
                              toast.success('Copied');
                            }}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <pre className="text-xs font-mono bg-muted/60 rounded px-3 py-2 overflow-x-auto text-muted-foreground">{m.reverseSql}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {!result && !isGenerating && (
        <p className="text-xs text-muted-foreground">
          Analyzes {getQueryHistory().length} queries against your schema to suggest migrations:
          missing indexes, implicit foreign keys, missing stored columns.
        </p>
      )}
    </Card>
  );
};
