interface QuerySuggestionsProps {
  query: string;
  schema?: string;
  onSelect: (suggestion: string) => void;
  minLength?: number;
}

// Disabled: triggers on every keystroke, accumulates API costs.
// Manual features (generate, explain, optimize) give full control.
export const QuerySuggestions = (_props: QuerySuggestionsProps) => null;
