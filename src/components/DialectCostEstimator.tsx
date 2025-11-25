import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RefreshCw, DollarSign, Trophy, AlertTriangle, Lightbulb } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface DialectCostEstimatorProps {
  sql: string;
  schema?: string;
}

interface DialectAnalysis {
  dialect: string;
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  scanComplexity: string;
  bottlenecks: string[];
  optimizations: string[];
  dialectSpecificNotes: string[];
  relativeScore: number;
}

interface CostResult {
  analyses: DialectAnalysis[];
  fastestDialect: string;
  summary: string;
  portabilityWarnings: string[];
}

const DIALECT_LABELS: Record<string, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  sqlite: 'SQLite',
  sqlserver: 'SQL Server',
};

const COMPLEXITY_COLORS: Record<string, string> = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  very_high: 'text-red-500',
};

export const DialectCostEstimator = ({ sql, schema }: DialectCostEstimatorProps) => {
  const [result, setResult] = useState<CostResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedDialects, setSelectedDialects] = useState<string[]>(['postgresql', 'mysql', 'sqlite', 'sqlserver']);

  const toggleDialect = (d: string) => {
    setSelectedDialects(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const handleAnalyze = async () => {
    if (!sql.trim()) {
      toast.error('No SQL query to analyze');
      return;
    }
    if (selectedDialects.length === 0) {
      toast.error('Select at least one dialect');
      return;
    }
    setIsAnalyzing(true);
    try {
      const data = await api.dialectCost(sql, schema, selectedDialects);
      setResult(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const scoreBar = (score: number) => {
    const pct = Math.min(100, (score / 10) * 100);
    const color = score <= 3 ? 'bg-green-500' : score <= 6 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-muted rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-muted-foreground w-4 text-right">{score}</span>
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Cross-Dialect Cost Estimator
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare query execution cost across SQL dialects
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !sql.trim() || selectedDialects.length === 0}
        >
          {isAnalyzing ? (
            <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
          ) : (
            <DollarSign className="w-3 h-3 mr-2" />
          )}
          {isAnalyzing ? 'Estimating...' : 'Estimate Cost'}
        </Button>
      </div>

      {/* Dialect selector */}
      <div className="flex flex-wrap gap-3">
        {(['postgresql', 'mysql', 'sqlite', 'sqlserver'] as const).map(d => (
          <div key={d} className="flex items-center gap-1.5">
            <Checkbox
              id={`dialect-${d}`}
              checked={selectedDialects.includes(d)}
              onCheckedChange={() => toggleDialect(d)}
            />
            <Label htmlFor={`dialect-${d}`} className="text-xs cursor-pointer">
              {DIALECT_LABELS[d]}
            </Label>
          </div>
        ))}
      </div>

      {result && (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4 pr-2">
            {/* Winner banner */}
            {result.fastestDialect && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-md p-3">
                <Trophy className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Most efficient: <span className="text-green-500">{DIALECT_LABELS[result.fastestDialect] ?? result.fastestDialect}</span>
                  </p>
                  {result.summary && <p className="text-xs text-muted-foreground">{result.summary}</p>}
                </div>
              </div>
            )}

            {/* Per-dialect cards */}
            <div className="grid gap-3">
              {result.analyses
                ?.sort((a, b) => a.relativeScore - b.relativeScore)
                .map((a, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Trophy className="w-3.5 h-3.5 text-green-500" />}
                        <span className="text-sm font-medium">{DIALECT_LABELS[a.dialect] ?? a.dialect}</span>
                        <span className={`text-xs font-mono ${COMPLEXITY_COLORS[a.complexity] ?? ''}`}>
                          {a.complexity.replace('_', ' ')}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">{a.scanComplexity}</Badge>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Relative cost (lower = better)</p>
                      {scoreBar(a.relativeScore)}
                    </div>

                    {a.bottlenecks?.length > 0 && (
                      <div className="space-y-1">
                        {a.bottlenecks.map((b, bi) => (
                          <div key={bi} className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground">{b}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {a.optimizations?.length > 0 && (
                      <div className="space-y-1">
                        {a.optimizations.map((o, oi) => (
                          <div key={oi} className="flex items-start gap-1.5">
                            <Lightbulb className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground">{o}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {a.dialectSpecificNotes?.length > 0 && (
                      <div className="space-y-1 border-t border-border pt-2">
                        {a.dialectSpecificNotes.map((n, ni) => (
                          <p key={ni} className="text-xs text-muted-foreground italic">{n}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Portability warnings */}
            {result.portabilityWarnings?.length > 0 && (
              <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-md p-3 space-y-1">
                <p className="text-xs font-semibold text-yellow-600">Portability Warnings</p>
                {result.portabilityWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{w}</p>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {!result && !isAnalyzing && (
        <p className="text-xs text-muted-foreground">
          Analyzes your query's execution cost characteristics across selected dialects —
          scan complexity, JOIN strategies, dialect-specific bottlenecks, and portability risks.
        </p>
      )}
    </Card>
  );
};
