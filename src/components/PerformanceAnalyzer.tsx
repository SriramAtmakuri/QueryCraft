import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface PerformanceOperation {
  type: string;
  table: string | null;
  cost: number;
  rows: number;
  description: string;
  warning: string | null;
}

interface PerformanceSuggestion {
  type: string;
  priority: string;
  description: string;
  sql: string;
}

interface PerformanceAnalysis {
  estimatedCost: number;
  estimatedRows: number;
  executionTime: string;
  operations: PerformanceOperation[];
  suggestions: PerformanceSuggestion[];
  summary: string;
}

interface PerformanceAnalyzerProps {
  sql: string;
  schema?: string;
}

export const PerformanceAnalyzer = ({ sql, schema }: PerformanceAnalyzerProps) => {
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!sql) {
      toast.error('No SQL query to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await api.analyzePerformance(sql, schema);
      setAnalysis(result);
      toast.success('Performance analysis complete');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to analyze performance');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCostColor = (cost: number) => {
    if (cost < 30) return 'text-green-500';
    if (cost < 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Performance Analysis</h2>
        <Button
          onClick={handleAnalyze}
          disabled={!sql || isAnalyzing}
          size="sm"
        >
          {isAnalyzing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            'Analyze'
          )}
        </Button>
      </div>

      {analysis ? (
        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className={`text-2xl font-bold ${getCostColor(analysis.estimatedCost)}`}>
                  {analysis.estimatedCost}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Est. Rows</p>
                <p className="text-2xl font-bold">{analysis.estimatedRows.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Est. Time</p>
                <p className="text-2xl font-bold">{analysis.executionTime}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 text-center">{analysis.summary}</p>
          </Card>

          {/* Operations */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Execution Plan</h3>
            <div className="space-y-2">
              {analysis.operations.map((op, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-primary/20 px-2 py-0.5 rounded">
                        {op.type}
                      </span>
                      {op.table && (
                        <span className="text-xs text-muted-foreground">on {op.table}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{op.description}</p>
                    {op.warning && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-yellow-500">
                        <AlertTriangle className="w-3 h-3" />
                        {op.warning}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <p>Cost: {op.cost}</p>
                    <p className="text-muted-foreground">{op.rows} rows</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Optimization Suggestions</h3>
              <div className="space-y-3">
                {analysis.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="border-l-2 border-primary pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(suggestion.priority)}`}>
                        {suggestion.priority}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{suggestion.type}</span>
                    </div>
                    <p className="text-sm">{suggestion.description}</p>
                    {suggestion.sql && (
                      <pre className="text-xs font-mono bg-muted p-2 rounded mt-2 overflow-x-auto">
                        {suggestion.sql}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
          <Info className="w-12 h-12 mb-4 opacity-50" />
          <p>Click "Analyze" to see execution plan and optimization suggestions</p>
        </div>
      )}
    </div>
  );
};
