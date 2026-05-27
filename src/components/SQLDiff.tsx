import { useMemo, useState } from 'react';
import { AIFeedback } from '@/components/AIFeedback';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Highlight, themes } from 'prism-react-renderer';
import { Sparkles, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface SQLDiffProps {
  original: string;
  modified: string;
  originalLabel?: string;
  modifiedLabel?: string;
  dialect?: string;
}

interface SemanticResult {
  isEquivalent: boolean;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  differences: { type: string; description: string; impact: 'high' | 'medium' | 'low' }[];
  edgeCases: string[];
  recommendation: string;
}

export const SQLDiff = ({
  original,
  modified,
  originalLabel = 'Original',
  modifiedLabel = 'Modified',
  dialect = 'postgresql',
}: SQLDiffProps) => {
  const [semanticResult, setSemanticResult] = useState<SemanticResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const diff = useMemo(() => {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    const result: Array<{
      type: 'unchanged' | 'removed' | 'added' | 'modified';
      original: string;
      modified: string;
    }> = [];

    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i] || '';
      const modLine = modifiedLines[i] || '';

      if (origLine === modLine) {
        result.push({ type: 'unchanged', original: origLine, modified: modLine });
      } else if (!origLine && modLine) {
        result.push({ type: 'added', original: '', modified: modLine });
      } else if (origLine && !modLine) {
        result.push({ type: 'removed', original: origLine, modified: '' });
      } else {
        result.push({ type: 'modified', original: origLine, modified: modLine });
      }
    }

    return result;
  }, [original, modified]);

  const handleSemanticAnalysis = async () => {
    if (!original || !modified) {
      toast.error('Need both queries to analyze');
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await api.semanticDiff(original, modified, dialect);
      setSemanticResult(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getLineClass = (type: string) => {
    switch (type) {
      case 'added': return 'bg-green-500/20';
      case 'removed': return 'bg-red-500/20';
      case 'modified': return 'bg-yellow-500/20';
      default: return '';
    }
  };

  const impactColor = (impact: string) => {
    if (impact === 'high') return 'destructive';
    if (impact === 'medium') return 'secondary';
    return 'outline';
  };

  const confidenceColor = (c: string) => {
    if (c === 'high') return 'text-green-500';
    if (c === 'medium') return 'text-yellow-500';
    return 'text-red-500';
  };

  const HighlightedLine = ({ code, className }: { code: string; className: string }) => (
    <Highlight theme={themes.vsDark} code={code || ' '} language="sql">
      {({ tokens, getTokenProps }) => (
        <div className={`px-2 py-0.5 ${className}`}>
          {tokens[0]?.map((token, key) => (
            <span key={key} {...getTokenProps({ token })} />
          ))}
        </div>
      )}
    </Highlight>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">{originalLabel}</h3>
          <div className="code-bg rounded-lg p-3 overflow-auto max-h-[300px]">
            <pre className="text-xs font-mono">
              {diff.map((line, idx) => (
                <HighlightedLine
                  key={`orig-${idx}`}
                  code={line.original}
                  className={
                    line.type === 'removed' || line.type === 'modified'
                      ? getLineClass(line.type === 'modified' ? 'removed' : line.type)
                      : ''
                  }
                />
              ))}
            </pre>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">{modifiedLabel}</h3>
          <div className="code-bg rounded-lg p-3 overflow-auto max-h-[300px]">
            <pre className="text-xs font-mono">
              {diff.map((line, idx) => (
                <HighlightedLine
                  key={`mod-${idx}`}
                  code={line.modified}
                  className={
                    line.type === 'added' || line.type === 'modified'
                      ? getLineClass(line.type === 'modified' ? 'added' : line.type)
                      : ''
                  }
                />
              ))}
            </pre>
          </div>
        </Card>
      </div>

      {/* Semantic Analysis */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Semantic Equivalence Analysis
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSemanticAnalysis}
            disabled={isAnalyzing || !original || !modified}
          >
            {isAnalyzing ? (
              <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 mr-2" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Analyze Semantics'}
          </Button>
        </div>

        {semanticResult ? (
          <div className="space-y-3">
            {/* Verdict */}
            <div className="flex items-center gap-3">
              {semanticResult.isEquivalent ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {semanticResult.isEquivalent ? 'Semantically Equivalent' : 'Not Equivalent'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Confidence: <span className={confidenceColor(semanticResult.confidence)}>{semanticResult.confidence}</span>
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{semanticResult.summary}</p>

            {/* Differences */}
            {semanticResult.differences?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Differences</p>
                {semanticResult.differences.map((d, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant={impactColor(d.impact) as 'destructive' | 'secondary' | 'outline'} className="text-xs flex-shrink-0 mt-0.5">
                      {d.impact}
                    </Badge>
                    <div>
                      <span className="text-xs font-medium">{d.type}: </span>
                      <span className="text-xs text-muted-foreground">{d.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Edge Cases */}
            {semanticResult.edgeCases?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Edge Cases</p>
                {semanticResult.edgeCases.map((ec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{ec}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendation */}
            {semanticResult.recommendation && (
              <div className="bg-muted rounded-md p-3">
                <p className="text-xs font-semibold mb-1">Recommendation</p>
                <p className="text-xs text-muted-foreground">{semanticResult.recommendation}</p>
              </div>
            )}
            <AIFeedback
              feature="semantic-diff"
              inputSummary={`${original.slice(0, 100)} vs ${modified.slice(0, 100)}`}
              outputSummary={`equivalent=${semanticResult.isEquivalent} confidence=${semanticResult.confidence}`}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click "Analyze Semantics" to determine if these queries return identical results for any dataset.
          </p>
        )}
      </Card>
    </div>
  );
};
