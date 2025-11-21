import { useMemo } from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { lintSQL, LintIssue, getLintSeverityBgColor } from '@/lib/sqlLinter';

interface SQLLinterProps {
  sql: string;
}

export const SQLLinter = ({ sql }: SQLLinterProps) => {
  const issues = useMemo(() => {
    if (!sql.trim()) return [];
    return lintSQL(sql);
  }, [sql]);

  if (!sql.trim() || issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-500 px-2 py-1">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        No issues detected
      </div>
    );
  }

  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const infoCount = issues.filter(i => i.type === 'info').length;

  const getIcon = (type: LintIssue['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
      case 'info':
        return <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs px-2">
        {errorCount > 0 && (
          <span className="flex items-center gap-1 text-red-500">
            <AlertCircle className="w-3 h-3" />
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </span>
        )}
        {warningCount > 0 && (
          <span className="flex items-center gap-1 text-yellow-500">
            <AlertTriangle className="w-3 h-3" />
            {warningCount} warning{warningCount !== 1 ? 's' : ''}
          </span>
        )}
        {infoCount > 0 && (
          <span className="flex items-center gap-1 text-blue-500">
            <Info className="w-3 h-3" />
            {infoCount} info
          </span>
        )}
      </div>
      <div className="max-h-[150px] overflow-auto space-y-1.5">
        {issues.map((issue, idx) => (
          <div
            key={idx}
            className={`text-xs p-2 rounded border ${getLintSeverityBgColor(issue.type)}`}
          >
            <div className="flex items-start gap-2">
              {getIcon(issue.type)}
              <div className="flex-1">
                <p className="font-medium">{issue.message}</p>
                {issue.suggestion && (
                  <p className="text-muted-foreground mt-0.5">{issue.suggestion}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
