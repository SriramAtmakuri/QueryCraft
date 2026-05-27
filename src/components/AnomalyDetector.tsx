import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface AnomalyDetectorProps {
  sql: string;
  queryHistory: string[];
  dialect?: string;
}

interface Anomaly {
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface AnomalyResult {
  isAnomalous: boolean;
  anomalyScore: number;
  anomalies: Anomaly[];
  baseline: { avgTableCount: number; commonPatterns: string[] };
  recommendation: string;
}

export function AnomalyDetector({ sql, queryHistory, dialect = 'postgresql' }: AnomalyDetectorProps) {
  const [result, setResult] = useState<AnomalyResult | null>(null);
  const [loading, setLoading] = useState(false);

  const detect = async () => {
    if (!sql) { toast.error('No SQL to analyze'); return; }
    if (queryHistory.length < 2) { toast.error('Need at least 2 historical queries for baseline'); return; }
    setLoading(true);
    try {
      const data = await api.anomalyDetect(sql, queryHistory, dialect);
      setResult(data);
      if (data.isAnomalous) toast.warning('Anomalies detected in this query');
      else toast.success('Query matches normal patterns');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => score > 70 ? 'text-red-500' : score > 40 ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-blue-500" />
          Anomaly Detector
        </h2>
        <p className="text-xs text-muted-foreground">Compares current query against {queryHistory.length} historical queries.</p>
      </div>
      <Button onClick={detect} disabled={loading || !sql} size="sm">
        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
        Detect Anomalies
      </Button>

      {loading && <div className="space-y-2"><Skeleton className="h-20 w-full" /></div>}

      {result && (
        <div className="space-y-3">
          <Card className={`p-4 ${result.isAnomalous ? 'border-red-500/30' : 'border-green-500/30'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.isAnomalous ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                <span className="font-medium">{result.isAnomalous ? 'Anomalous Query' : 'Normal Pattern'}</span>
              </div>
              <span className={`text-2xl font-bold ${scoreColor(result.anomalyScore)}`}>{result.anomalyScore}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Anomaly score (higher = more unusual)</p>
          </Card>

          {result.anomalies.length > 0 && (
            <div className="space-y-2">
              {result.anomalies.map((a, i) => (
                <Card key={i} className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={a.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">{a.severity}</Badge>
                    <span className="text-xs font-medium">{a.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </Card>
              ))}
            </div>
          )}

          {result.baseline.commonPatterns.length > 0 && (
            <Card className="p-3">
              <h4 className="text-xs font-semibold mb-2">Baseline Patterns</h4>
              <ul className="space-y-1">
                {result.baseline.commonPatterns.map((p, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {p}</li>
                ))}
              </ul>
            </Card>
          )}

          <p className="text-sm text-muted-foreground">{result.recommendation}</p>
        </div>
      )}
    </div>
  );
}
