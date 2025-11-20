import { createContext, useContext, useState, ReactNode } from 'react';
import { TableSchema, SchemaParseResult } from '@/lib/sqlParser';

interface SchemaContextType {
  schema: SchemaParseResult;
  setSchema: (schema: SchemaParseResult) => void;
  schemaText: string;
  setSchemaText: (text: string) => void;
}

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);

export const SchemaProvider = ({ children }: { children: ReactNode }) => {
  const [schema, setSchema] = useState<SchemaParseResult>({
    tables: [],
    relationships: []
  });
  const [schemaText, setSchemaText] = useState('');

  return (
    <SchemaContext.Provider value={{ schema, setSchema, schemaText, setSchemaText }}>
      {children}
    </SchemaContext.Provider>
  );
};

export const useSchema = () => {
  const context = useContext(SchemaContext);
  if (!context) {
    throw new Error('useSchema must be used within a SchemaProvider');
  }
  return context;
};
