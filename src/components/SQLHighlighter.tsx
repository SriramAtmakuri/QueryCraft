import { Highlight, themes } from 'prism-react-renderer';

interface SQLHighlighterProps {
  code: string;
  className?: string;
}

export const SQLHighlighter = ({ code, className = '' }: SQLHighlighterProps) => {
  return (
    <Highlight theme={themes.vsDark} code={code} language="sql">
      {({ className: preClassName, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={`${preClassName} ${className} overflow-auto`} style={{ ...style, background: 'transparent', margin: 0, padding: 0 }}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
};
