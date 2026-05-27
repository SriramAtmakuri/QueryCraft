import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Plus, Trash2, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface AssertionTesterProps {
  sql: string;
  dialect?: string;
}

interface CompiledAssertion {
  original: string;
  checkConstraint: string;
  testQuery: string;
  explanation: string;
}

interface AssertionResult {
  compiledAssertions: CompiledAssertion[];
  testHarness: string;
  summary: string;
}

export function AssertionTester({ sql, dialect = 'postgresql' }: AssertionTesterProps) {
  const [assertions, setAssertions] = useState<string[]>(['']);
  const [result, setResult] = useState<AssertionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const addAssertion = () => setAssertions(prev => [...prev, '']);
  const updateAssertion = (i: number, val: string) => setAssertions(prev => prev.map((a, idx) => idx === i ? val : a));
  const removeAssertion = (i: number) => setAssertions(prev => prev.filter((_, idx) => idx !== i));

  const compile = async () => {
    const valid = assertions.filter(a => a.trim());
    if (!sql) { toast.error('No SQL to test assertions against'); return; }
    if (valid.length === 0) { toast.error('Add at least one assertion'); return; }
    setLoading(true);
    try {
      const data = await api.compileAssertions(sql, valid, dialect);
      setResult(data);
      toast.success(`${data.compiledAssertions.length} assertions compiled`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Compilation failed');
    } finally {
      setLoading(false);
    }
  };

  const copyHarness = () => {
    if (result) { navigator.clipboard.writeText(result.testHarness); toast.success('Test harness copied'); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <CheckSquare className="w-5 h-5 text-emerald-500" />
          Natural Language Assertion Tester
        </h2>
        <p className="text-xs text-muted-foreground">Write assertions in plain English — compile to SQL CHECK constraints.</p>
      </div>

      <div className="space-y-2">
        {assertions.map((a, i) => (
          <div key={i} className="flex gap-2">
            <Textarea
              placeholder={`e.g. "email must contain @", "age must be positive", "status must be active or inactive"`}
              value={a}
              onChange={e => updateAssertion(i, e.target.value)}
              className="min-h-[60px] text-sm resize-none"
            />
            {assertions.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => removeAssertion(i)} className="shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addAssertion} disabled={assertions.length >= 20}>
          <Plus className="w-4 h-4 mr-1" /> Add Assertion
        </Button>
      </div>

      <Button onClick={compile} disabled={loading || !sql} size="sm">
        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-2" />}
        Compile Assertions
      </Button>

      {loading && <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>}

      {result && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{result.summary}</p>
          {result.compiledAssertions.map((ca, i) => (
            <Card key={i} className="p-3">
              <p className="text-xs text-muted-foreground mb-2">"{ca.original}"</p>
              <p className="text-xs mb-1">{ca.explanation}</p>
              <div className="space-y-1">
                <div>
                  <Badge variant="secondary" className="text-xs mb-1">CHECK Constraint</Badge>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">{ca.checkConstraint}</pre>
                </div>
                <div>
                  <Badge variant="outline" className="text-xs mb-1">Test Query</Badge>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">{ca.testQuery}</pre>
                </div>
              </div>
            </Card>
          ))}
          {result.testHarness && (
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold">Full Test Harness</h4>
                <Button variant="ghost" size="sm" onClick={copyHarness}><Copy className="w-3 h-3" /></Button>
              </div>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">{result.testHarness}</pre>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
