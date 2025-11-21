import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SQLHighlighter } from '@/components/SQLHighlighter';
import { Copy, Play, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface MultiQuery {
  description: string;
  sql: string;
  order: number;
  dependencies: number[];
}

interface MultiQueryPanelProps {
  queries: MultiQuery[];
  onRunQuery?: (sql: string) => void;
  onSelectAll?: (combined: string) => void;
}

export const MultiQueryPanel = ({ queries, onRunQuery, onSelectAll }: MultiQueryPanelProps) => {
  const [expandedQueries, setExpandedQueries] = useState<Set<number>>(new Set(queries.map(q => q.order)));

  const toggleExpand = (order: number) => {
    setExpandedQueries(prev => {
      const next = new Set(prev);
      if (next.has(order)) {
        next.delete(order);
      } else {
        next.add(order);
      }
      return next;
    });
  };

  const handleCopy = (sql: string) => {
    navigator.clipboard.writeText(sql);
    toast.success('Query copied to clipboard');
  };

  const handleCopyAll = () => {
    const combined = queries
      .sort((a, b) => a.order - b.order)
      .map(q => `-- ${q.order}. ${q.description}\n${q.sql}`)
      .join('\n\n');
    navigator.clipboard.writeText(combined);
    toast.success('All queries copied to clipboard');
  };

  const handleSelectAll = () => {
    const combined = queries
      .sort((a, b) => a.order - b.order)
      .map(q => q.sql)
      .join(';\n\n');
    onSelectAll?.(combined);
    toast.success('Combined queries loaded');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{queries.length} Queries Generated</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyAll}>
            <Copy className="w-3 h-3 mr-1" />
            Copy All
          </Button>
          {onSelectAll && (
            <Button variant="secondary" size="sm" onClick={handleSelectAll}>
              Use Combined
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {queries.sort((a, b) => a.order - b.order).map((query) => (
          <Card key={query.order} className="overflow-hidden">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleExpand(query.order)}
            >
              <div className="flex items-center gap-2">
                {expandedQueries.has(query.order) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                  {query.order}
                </span>
                <span className="text-sm font-medium">{query.description}</span>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleCopy(query.sql)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                {onRunQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onRunQuery(query.sql)}
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            {expandedQueries.has(query.order) && (
              <div className="border-t border-border">
                <div className="code-bg p-3 overflow-auto max-h-[200px]">
                  <SQLHighlighter code={query.sql} className="text-xs" />
                </div>
                {query.dependencies.length > 0 && (
                  <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground">
                    Depends on: {query.dependencies.map(d => `Query ${d}`).join(', ')}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
