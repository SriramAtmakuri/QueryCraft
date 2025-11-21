import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Lightbulb, RefreshCw } from 'lucide-react';

interface Suggestion {
  text: string;
  description: string;
}

interface QuerySuggestionsProps {
  query: string;
  schema?: string;
  onSelect: (suggestion: string) => void;
  minLength?: number;
}

export const QuerySuggestions = ({
  query,
  schema,
  onSelect,
  minLength = 3
}: QuerySuggestionsProps) => {
  // Feature disabled to avoid API charges from automatic requests
  // The suggestions feature triggers on every keystroke which can accumulate costs
  // Other features (generate, explain, optimize) are manual and give you control
  return null;

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastQueryRef = useRef<string>('');

  useEffect(() => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't fetch if query is too short or same as last query
    if (query.length < minLength || query === lastQueryRef.current) {
      if (query.length < minLength) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }

    // Debounce API calls
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setShowSuggestions(true); // Show loading state
      try {
        const result = await api.getQuerySuggestions(query, schema);
        const fetchedSuggestions = result.suggestions || [];
        setSuggestions(fetchedSuggestions);
        setShowSuggestions(fetchedSuggestions.length > 0);
        lastQueryRef.current = query;
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, schema, minLength]);

  const handleSelect = (suggestion: Suggestion) => {
    onSelect(suggestion.text);
    setShowSuggestions(false);
    lastQueryRef.current = suggestion.text;
  };

  // Hide when query is too short
  if (query.length < minLength) return null;

  // Show loading or suggestions
  if (!showSuggestions && !isLoading) return null;

  return (
    <div className="absolute left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
      {isLoading ? (
        <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Getting suggestions...
        </div>
      ) : (
        <div className="max-h-[200px] overflow-auto">
          <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border flex items-center gap-1.5">
            <Lightbulb className="w-3 h-3" />
            Suggestions
          </div>
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b border-border last:border-0"
            >
              <p className="text-sm font-medium">{suggestion.text}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {suggestion.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
