import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Table2,
  Columns,
  Zap,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { getQueryHistory } from '@/lib/queryManager';

interface SchemaDriftAnalyzerProps {
  schema: string;
  dialect?: string;
}

interface DriftResult {
  unusedTables: { table: string; confidence: string; suggestion: string }[];
  unusedColumns: { table: string; column: string; suggestion: string }[];
  hotTables: { table: string; queryCount: number; insight: string }[];
  indexSuggestions: { table: string; columns: string[]; reason: string; sql: string; impact: string }[];
  summary: string;
}

export const SchemaDriftAnalyzer = ({ schema, dialect = 'postgresql' }: SchemaDriftAnalyzerProps) => {
  const [result, setResult] = useState<DriftResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!schema.trim()) {
      toast.error('Paste a schema first');
      return;
    }
    const history = getQueryHistory();
    if (history.length === 0) {
      toast.error('No query history found — generate some queries first');
      return;
    }
    setIsAnalyzing(true);
    try {
      const queries = history.map(h => h.sql);
      const data = await api.schemaDrift(schema, queries, dialect);
      setResult(data);
      toast.success('Schema drift analysis complete');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const impactBadge = (impact: string) => {
    if (impact === 'high') return <Badge variant="destructive">{impact}</Badge>;
    if (impact === 'medium') return <Badge variant="secondary">{impact}</Badge>;
    return <Badge variant="outline">{impact}</Badge>;
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Schema Drift Detection
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Finds unused tables/columns and missing indexes from your query history
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !schema.trim()}
        >
          {isAnalyzing ? (
            <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
          ) : (
            <AlertTriangle className="w-3 h-3 mr-2" />
          )}
          {isAnalyzing ? 'Analyzing...' : 'Detect Drift'}
        </Button>
      </div>

      {result && (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4 pr-2">
            {result.summary && (
              <div className="bg-muted rounded-md p-3">
                <p className="text-xs text-muted-foreground">{result.summary}</p>
              </div>
            )}

            {/* Hot Tables */}
            {result.hotTables?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Hot Tables
                </p>
                <div className="space-y-1.5">
                  {result.hotTables.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded border border-border bg-card">
                      <Table2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-mono font-medium">{t.table}</span>
                        <span className="text-xs text-muted-foreground ml-2">({t.queryCount} queries)</span>
                        <p className="text-xs text-muted-foreground">{t.insight}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Index Suggestions */}
            {result.indexSuggestions?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Index Suggestions
                </p>
                <div className="space-y-2">
                  {result.indexSuggestions.map((s, i) => (
                    <div key={i} className="p-2 rounded border border-border bg-card space-y-1.5">
                      <div className="flex items-center gap-2">
                        {impactBadge(s.impact)}
                        <span className="text-xs font-mono">{s.table}({s.columns.join(', ')})</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.reason}</p>
                      <pre className="text-xs font-mono bg-muted rounded px-2 py-1 overflow-x-auto">{s.sql}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unused Tables */}
            {result.unusedTables?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Table2 className="w-3 h-3 text-muted-foreground" /> Potentially Unused Tables
                </p>
                <div className="space-y-1.5">
                  {result.unusedTables.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded border border-dashed border-border">
                      <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-mono font-medium">{t.table}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{t.confidence} confidence</Badge>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unused Columns */}
            {result.unusedColumns?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Columns className="w-3 h-3 text-muted-foreground" /> Potentially Unused Columns
                </p>
                <div className="space-y-1.5">
                  {result.unusedColumns.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded border border-dashed border-border">
                      <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-mono font-medium">{c.table}.{c.column}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {!result && !isAnalyzing && (
        <p className="text-xs text-muted-foreground">
          Analyzes your schema against {getQueryHistory().length} saved queries to find unused tables,
          unused columns, hot paths, and missing indexes.
        </p>
      )}
    </Card>
  );
};
