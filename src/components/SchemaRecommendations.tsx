import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, RefreshCw, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface SchemaRecommendationsProps {
  schema: string;
  queries: string[];
  dialect?: string;
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  ddlExample: string;
}

interface RecommendResult {
  recommendations: Recommendation[];
  summary: string;
  quickWins: string[];
}

export function SchemaRecommendations({ schema, queries, dialect = 'postgresql' }: SchemaRecommendationsProps) {
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!schema) { toast.error('No schema loaded — upload a schema first'); return; }
    if (queries.length === 0) { toast.error('No queries to analyze'); return; }
    setLoading(true);
    try {
      const data = await api.schemaRecommend(schema, queries, dialect);
      setResult(data);
      toast.success(`${data.recommendations.length} recommendations generated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const impactBadge = { high: 'destructive', medium: 'secondary', low: 'outline' } as const;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-purple-500" />
          Schema Recommendation Engine
        </h2>
        <p className="text-xs text-muted-foreground">Analyzes {queries.length} queries against your schema to suggest structural improvements.</p>
      </div>
      <Button onClick={analyze} disabled={loading || !schema} size="sm">
        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
        Analyze Schema
      </Button>

      {loading && <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>}

      {result && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{result.summary}</p>

          {result.quickWins.length > 0 && (
            <Card className="p-3 border-green-500/30">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><Zap className="w-3 h-3 text-green-500" /> Quick Wins</h4>
              <ul className="space-y-1">
                {result.quickWins.map((w, i) => <li key={i} className="text-xs text-muted-foreground">• {w}</li>)}
              </ul>
            </Card>
          )}

          {result.recommendations.map((r, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-semibold">{r.title}</h4>
                  <span className="text-xs text-muted-foreground">{r.type}</span>
                </div>
                <div className="flex gap-1">
                  <Badge variant={impactBadge[r.impact]} className="text-xs">Impact: {r.impact}</Badge>
                  <Badge variant="outline" className="text-xs">Effort: {r.effort}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{r.description}</p>
              {r.ddlExample && (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">{r.ddlExample}</pre>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
