import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Bug, CheckCircle, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface DebugResult {
  errorType: string;
  explanation: string;
  location: string;
  fixedQuery: string;
  prevention: string;
}

interface SQLDebuggerProps {
  sql: string;
  schema?: string;
  onApplyFix?: (sql: string) => void;
}

export const SQLDebugger = ({ sql, schema, onApplyFix }: SQLDebuggerProps) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  const handleDebug = async () => {
    if (!sql) {
      toast.error('No SQL query to debug');
      return;
    }
    if (!errorMessage.trim()) {
      toast.error('Please enter the error message');
      return;
    }

    setIsDebugging(true);
    try {
      const result = await api.debugSQL(sql, errorMessage, schema);
      setDebugResult(result);
      toast.success('Debug analysis complete');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to debug SQL');
    } finally {
      setIsDebugging(false);
    }
  };

  const handleCopyFixed = () => {
    if (debugResult?.fixedQuery) {
      navigator.clipboard.writeText(debugResult.fixedQuery);
      toast.success('Fixed query copied to clipboard');
    }
  };

  const handleApplyFix = () => {
    if (debugResult?.fixedQuery && onApplyFix) {
      onApplyFix(debugResult.fixedQuery);
      toast.success('Fixed query applied');
    }
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'syntax': return 'bg-red-500/20 text-red-400';
      case 'type_mismatch': return 'bg-orange-500/20 text-orange-400';
      case 'constraint': return 'bg-yellow-500/20 text-yellow-400';
      case 'reference': return 'bg-blue-500/20 text-blue-400';
      case 'permission': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">SQL Debugger</h2>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Error Message</label>
          <Textarea
            placeholder="Paste the error message you received..."
            value={errorMessage}
            onChange={(e) => setErrorMessage(e.target.value)}
            className="min-h-[100px] font-mono text-sm"
          />
        </div>

        <Button
          onClick={handleDebug}
          disabled={!sql || !errorMessage.trim() || isDebugging}
          className="w-full"
        >
          {isDebugging ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Bug className="w-4 h-4 mr-2" />
          )}
          Debug Query
        </Button>
      </div>

      {debugResult && (
        <div className="space-y-3">
          {/* Error Type Badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${getErrorTypeColor(debugResult.errorType)}`}>
              {debugResult.errorType.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Explanation */}
          <Card className="p-3">
            <h4 className="text-sm font-semibold mb-2">What went wrong</h4>
            <p className="text-sm text-muted-foreground">{debugResult.explanation}</p>
            {debugResult.location && (
              <p className="text-xs mt-2">
                <span className="text-muted-foreground">Location: </span>
                <code className="bg-muted px-1 rounded">{debugResult.location}</code>
              </p>
            )}
          </Card>

          {/* Fixed Query */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Fixed Query
              </h4>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleCopyFixed}>
                  <Copy className="w-3 h-3" />
                </Button>
                {onApplyFix && (
                  <Button variant="secondary" size="sm" onClick={handleApplyFix}>
                    Apply Fix
                  </Button>
                )}
              </div>
            </div>
            <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
              {debugResult.fixedQuery}
            </pre>
          </Card>

          {/* Prevention Tip */}
          <Card className="p-3 border-primary/30">
            <h4 className="text-sm font-semibold mb-1">Prevention Tip</h4>
            <p className="text-xs text-muted-foreground">{debugResult.prevention}</p>
          </Card>
        </div>
      )}
    </div>
  );
};
