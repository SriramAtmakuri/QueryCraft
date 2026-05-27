import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DollarSign, RefreshCw, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface QueryBudgetEnforcerProps {
  sql: string;
  schema?: string;
  dialect?: string;
}

interface CostBreakdown {
  operation: string;
  costUnits: number;
  reason: string;
}

interface BudgetResult {
  estimatedCost: number;
  withinBudget: boolean;
  breakdown: CostBreakdown[];
  optimizations: string[];
  worstCase: number;
  bestCase: number;
  verdict: string;
}

export function QueryBudgetEnforcer({ sql, schema, dialect = 'postgresql' }: QueryBudgetEnforcerProps) {
  const [maxCost, setMaxCost] = useState('1000');
  const [result, setResult] = useState<BudgetResult | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!sql) { toast.error('No SQL to check'); return; }
    const budget = parseInt(maxCost, 10);
    if (isNaN(budget) || budget < 1) { toast.error('Enter a valid budget (min 1)'); return; }
    setLoading(true);
    try {
      const data = await api.budgetCheck(sql, budget, schema, dialect);
      setResult(data);
      if (data.withinBudget) toast.success('Query within budget');
      else toast.warning('Query exceeds budget');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Budget check failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <DollarSign className="w-5 h-5 text-green-500" />
          Query Budget Enforcer
        </h2>
        <p className="text-xs text-muted-foreground">Estimate query cost and check against your compute budget. 1 unit ≈ indexed lookup on 1M rows.</p>
      </div>
      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium shrink-0">Max Cost Units:</label>
        <Input
          type="number"
          value={maxCost}
          onChange={e => setMaxCost(e.target.value)}
          className="w-32 h-8 text-sm"
          min="1"
        />
        <Button onClick={check} disabled={loading || !sql} size="sm">
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
          Check Budget
        </Button>
      </div>

      {loading && <Skeleton className="h-40 w-full" />}

      {result && (
        <div className="space-y-3">
          <Card className={`p-4 ${result.withinBudget ? 'border-green-500/30' : 'border-red-500/30'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.withinBudget ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
                <span className="font-medium">{result.withinBudget ? 'Within Budget' : 'Over Budget'}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{result.estimatedCost.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">estimated units</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{result.verdict}</p>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>Best: {result.bestCase.toLocaleString()}</span>
              <span>Worst: {result.worstCase.toLocaleString()}</span>
            </div>
          </Card>

          {result.breakdown.length > 0 && (
            <Card className="p-3">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Cost Breakdown</h4>
              <div className="space-y-1">
                {result.breakdown.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium">{b.operation}</span>
                      <span className="text-muted-foreground ml-2">{b.reason}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{b.costUnits.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.optimizations.length > 0 && (
            <Card className="p-3 border-blue-500/30">
              <h4 className="text-xs font-semibold mb-2">Cost Reduction Tips</h4>
              <ul className="space-y-1">
                {result.optimizations.map((o, i) => <li key={i} className="text-xs text-muted-foreground">• {o}</li>)}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
