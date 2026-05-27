import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GitMerge, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface QueryChangelogProps {
  sql: string;
  dialect?: string;
}

interface ChangelogResult {
  changelog: string;
  changes: { category: string; description: string; impact: string }[];
  breakingChanges: string[];
  summary: string;
  semverBump: string;
}

export function QueryChangelog({ sql, dialect = 'postgresql' }: QueryChangelogProps) {
  const [previousSql, setPreviousSql] = useState('');
  const [result, setResult] = useState<ChangelogResult | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!sql) { toast.error('No current SQL'); return; }
    if (!previousSql.trim()) { toast.error('Enter the previous version of the query'); return; }
    setLoading(true);
    try {
      const data = await api.diffVersions(previousSql, sql, dialect, 'Previous', 'Current');
      setResult(data);
      toast.success('Changelog generated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Changelog generation failed');
    } finally {
      setLoading(false);
    }
  };

  const impactColor = { breaking: 'destructive', behavioral: 'secondary', cosmetic: 'outline' } as const;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <GitMerge className="w-5 h-5 text-teal-500" />
          Query Changelog
        </h2>
        <p className="text-xs text-muted-foreground">Paste the old query to auto-generate a human-readable changelog.</p>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Previous Query</label>
        <Textarea
          placeholder="Paste the previous version of the SQL query here..."
          value={previousSql}
          onChange={e => setPreviousSql(e.target.value)}
          className="min-h-[100px] font-mono text-sm"
        />
      </div>
      <Button onClick={generate} disabled={loading || !sql || !previousSql.trim()} size="sm">
        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <GitMerge className="w-4 h-4 mr-2" />}
        Generate Changelog
      </Button>

      {loading && <Skeleton className="h-32 w-full" />}

      {result && (
        <div className="space-y-3">
          <Card className="p-4 border-teal-500/30">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-semibold">Changelog</h4>
              <Badge variant="outline" className="text-xs">{result.semverBump} bump</Badge>
            </div>
            <p className="text-sm">{result.changelog}</p>
          </Card>

          {result.breakingChanges.length > 0 && (
            <Card className="p-3 border-red-500/30">
              <h4 className="text-xs font-semibold text-red-500 mb-1">Breaking Changes</h4>
              {result.breakingChanges.map((b, i) => <p key={i} className="text-xs">• {b}</p>)}
            </Card>
          )}

          <div className="space-y-1">
            {result.changes.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Badge variant={impactColor[c.impact as keyof typeof impactColor] || 'outline'} className="text-xs shrink-0">{c.impact}</Badge>
                <span className="text-muted-foreground shrink-0">{c.category}:</span>
                <span>{c.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
