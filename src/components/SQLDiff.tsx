import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Highlight, themes } from 'prism-react-renderer';

interface SQLDiffProps {
  original: string;
  modified: string;
  originalLabel?: string;
  modifiedLabel?: string;
}

export const SQLDiff = ({
  original,
  modified,
  originalLabel = 'Original',
  modifiedLabel = 'Modified',
}: SQLDiffProps) => {
  const diff = useMemo(() => {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    // Simple line-by-line diff
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

  const getLineClass = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-500/20';
      case 'removed':
        return 'bg-red-500/20';
      case 'modified':
        return 'bg-yellow-500/20';
      default:
        return '';
    }
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
  );
};
