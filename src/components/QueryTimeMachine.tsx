import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCommit, RefreshCw, Save, Clock, GitCompare } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface QueryTimeMachineProps {
  sql: string;
  dialect?: string;
}

interface QueryVersion {
  id: string;
  queryName: string;
  sql: string;
  note: string | null;
  version: number;
  createdAt: string;
}

interface DiffResult {
  changelog: string;
  changes: { category: string; description: string; impact: string }[];
  breakingChanges: string[];
  summary: string;
  semverBump: string;
}

export function QueryTimeMachine({ sql, dialect = 'postgresql' }: QueryTimeMachineProps) {
  const [queryName, setQueryName] = useState('my-query');
  const [note, setNote] = useState('');
  const [versions, setVersions] = useState<QueryVersion[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const save = async () => {
    if (!sql) { toast.error('No SQL to save'); return; }
    setSaving(true);
    try {
      await api.saveVersion(queryName, sql, note || undefined);
      toast.success(`Saved as version of "${queryName}"`);
      setNote('');
      await loadVersions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await api.getVersions(queryName);
      setVersions(data.versions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
    setDiff(null);
  };

  const compareDiff = async () => {
    if (selectedVersions.length !== 2) { toast.error('Select exactly 2 versions to compare'); return; }
    const v1 = versions.find(v => v.id === selectedVersions[0]);
    const v2 = versions.find(v => v.id === selectedVersions[1]);
    if (!v1 || !v2) return;
    setDiffLoading(true);
    try {
      const data = await api.diffVersions(v1.sql, v2.sql, dialect, `v${v1.version}`, `v${v2.version}`);
      setDiff(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Diff failed');
    } finally {
      setDiffLoading(false);
    }
  };

  const impactColor = { breaking: 'destructive', behavioral: 'secondary', cosmetic: 'outline' } as const;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-violet-500" />
          Query Time Machine
        </h2>
        <p className="text-xs text-muted-foreground">Version your queries and compare changes over time.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Query name" value={queryName} onChange={e => setQueryName(e.target.value)} className="w-40 h-8 text-sm" />
        <Input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="w-48 h-8 text-sm" />
        <Button size="sm" onClick={save} disabled={saving || !sql}>
          {saving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save Version
        </Button>
        <Button size="sm" variant="outline" onClick={loadVersions} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Clock className="w-4 h-4 mr-1" />} Load History
        </Button>
      </div>

      {loading && <Skeleton className="h-32 w-full" />}

      {versions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{versions.length} versions — select 2 to compare</p>
            {selectedVersions.length === 2 && (
              <Button size="sm" variant="outline" onClick={compareDiff} disabled={diffLoading}>
                {diffLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <GitCompare className="w-3 h-3 mr-1" />} Compare
              </Button>
            )}
          </div>
          {versions.map(v => (
            <Card
              key={v.id}
              className={`p-3 cursor-pointer transition-colors ${selectedVersions.includes(v.id) ? 'border-primary' : 'hover:bg-muted/50'}`}
              onClick={() => toggleSelect(v.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="secondary" className="text-xs">v{v.version}</Badge>
                  {v.note && <span className="text-xs text-muted-foreground">{v.note}</span>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</span>
              </div>
              <pre className="text-xs text-muted-foreground overflow-hidden line-clamp-2">{v.sql}</pre>
            </Card>
          ))}
        </div>
      )}

      {diff && (
        <Card className="p-4 border-violet-500/30">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <GitCompare className="w-4 h-4" /> Changelog
            <Badge variant="outline" className="text-xs">{diff.semverBump} bump</Badge>
          </h4>
          <p className="text-sm mb-3">{diff.changelog}</p>
          {diff.breakingChanges.length > 0 && (
            <Card className="p-2 border-red-500/30 mb-2">
              <p className="text-xs font-semibold text-red-500 mb-1">Breaking Changes</p>
              {diff.breakingChanges.map((b, i) => <p key={i} className="text-xs">• {b}</p>)}
            </Card>
          )}
          <div className="space-y-1">
            {diff.changes.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Badge variant={impactColor[c.impact as keyof typeof impactColor] || 'outline'} className="text-xs">{c.impact}</Badge>
                <span className="text-muted-foreground">{c.category}:</span>
                <span>{c.description}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
