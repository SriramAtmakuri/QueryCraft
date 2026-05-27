import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Fingerprint, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface QueryFingerprinterProps {
  sql: string;
}

interface FingerprintResult {
  fingerprint: string;
  normalizedSql: string;
  tables: string[];
  isNew: boolean;
  similarCount: number;
  similarQueries: { sql: string; similarity: string }[];
}

export function QueryFingerprinter({ sql }: QueryFingerprinterProps) {
  const [result, setResult] = useState<FingerprintResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fingerprint = async () => {
    if (!sql) { toast.error('No SQL to fingerprint'); return; }
    setLoading(true);
    try {
      const data = await api.fingerprintSQL(sql);
      setResult(data);
      toast.success(data.isNew ? 'New fingerprint registered' : `Found ${data.similarCount} similar queries`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fingerprinting failed');
    } finally {
      setLoading(false);
    }
  };

  const copyFingerprint = () => {
    if (result) {
      navigator.clipboard.writeText(result.fingerprint);
      toast.success('Fingerprint copied');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <Fingerprint className="w-5 h-5 text-indigo-500" />
          Query Fingerprinter
        </h2>
        <p className="text-xs text-muted-foreground">Normalizes query structure to detect duplicate business logic.</p>
      </div>
      <Button onClick={fingerprint} disabled={loading || !sql} size="sm">
        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
        Fingerprint Query
      </Button>

      {loading && <Skeleton className="h-32 w-full" />}

      {result && (
        <div className="space-y-3">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold">Fingerprint Hash</h4>
              <div className="flex items-center gap-2">
                <Badge variant={result.isNew ? 'secondary' : 'outline'}>{result.isNew ? 'New' : 'Known'}</Badge>
                <Button variant="ghost" size="sm" onClick={copyFingerprint}><Copy className="w-3 h-3" /></Button>
              </div>
            </div>
            <code className="text-xs bg-muted p-2 rounded block font-mono break-all">{result.fingerprint}</code>
          </Card>

          <Card className="p-3">
            <h4 className="text-xs font-semibold mb-2">Tables Referenced</h4>
            <div className="flex flex-wrap gap-1">
              {result.tables.map((t, i) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}
            </div>
          </Card>

          <Card className="p-3">
            <h4 className="text-xs font-semibold mb-2">Normalized Form</h4>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">{result.normalizedSql}</pre>
          </Card>

          {result.similarQueries.length > 0 && (
            <Card className="p-3">
              <h4 className="text-xs font-semibold mb-2">Similar Queries ({result.similarCount})</h4>
              <div className="space-y-2">
                {result.similarQueries.map((q, i) => (
                  <div key={i} className="border-b border-border pb-2 last:border-0">
                    <Badge variant="secondary" className="text-xs mb-1">{q.similarity}</Badge>
                    <pre className="text-xs text-muted-foreground overflow-auto">{q.sql}</pre>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
