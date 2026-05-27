import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Zap, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface BlastRadiusAnalyzerProps {
  savedQueries: string[];
  dialect?: string;
}

interface AffectedQuery {
  sql: string;
  reason: string;
  severity: 'breaking' | 'warning' | 'safe';
  fixedSql: string;
}

interface BlastResult {
  affectedQueries: AffectedQuery[];
  safeQueries: number;
  summary: string;
  migrationRisk: 'high' | 'medium' | 'low';
}

export function BlastRadiusAnalyzer({ savedQueries, dialect = 'postgresql' }: BlastRadiusAnalyzerProps) {
  const [schemaChange, setSchemaChange] = useState('');
  const [result, setResult] = useState<BlastResult | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!schemaChange.trim()) { toast.error('Enter a schema change (ALTER TABLE, DROP COLUMN, etc.)'); return; }
    if (savedQueries.length === 0) { toast.error('No queries to analyze — generate a SQL query first'); return; }
    setLoading(true);
    try {
      const data = await api.blastRadius(schemaChange, savedQueries, dialect);
      setResult(data);
      toast.success('Blast radius analysis complete');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = { high: 'destructive', medium: 'secondary', low: 'outline' } as const;
  const severityIcon = { breaking: <AlertTriangle className="w-3 h-3" />, warning: <Zap className="w-3 h-3" />, safe: <CheckCircle className="w-3 h-3" /> };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Blast Radius Analyzer
        </h2>
        <p className="text-xs text-muted-foreground">Enter a schema change to see which queries will break.</p>
      </div>
      <Textarea
        placeholder="ALTER TABLE users DROP COLUMN legacy_field;"
        value={schemaChange}
        onChange={e => setSchemaChange(e.target.value)}
        className="min-h-[80px] font-mono text-sm"
      />
      <Button onClick={analyze} disabled={loading || !schemaChange.trim()} size="sm">
        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
        Analyze Impact
      </Button>

      {loading && <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={riskColor[result.migrationRisk]}>Migration Risk: {result.migrationRisk.toUpperCase()}</Badge>
            <span className="text-xs text-muted-foreground">{result.safeQueries} queries unaffected</span>
          </div>
          <p className="text-sm text-muted-foreground">{result.summary}</p>
          {result.affectedQueries.length === 0 ? (
            <Card className="p-3 border-green-500/30"><p className="text-sm text-green-600">No queries affected by this change.</p></Card>
          ) : (
            <div className="space-y-2">
              {result.affectedQueries.map((q, i) => (
                <Card key={i} className={`p-3 ${q.severity === 'breaking' ? 'border-red-500/30' : q.severity === 'warning' ? 'border-yellow-500/30' : 'border-green-500/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {severityIcon[q.severity]}
                    <Badge variant={q.severity === 'breaking' ? 'destructive' : 'secondary'} className="text-xs">{q.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{q.reason}</span>
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">{q.sql}</pre>
                  {q.fixedSql && q.fixedSql !== q.sql && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-green-600 mb-1">Suggested fix:</p>
                      <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-2 rounded overflow-auto">{q.fixedSql}</pre>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
