import { createContext, useContext, useState, ReactNode } from 'react';
import { TableSchema, SchemaParseResult } from '@/lib/sqlParser';

export interface SampleData {
  tableName: string;
  columns: string[];
  rows: string[][];
}

interface SchemaContextType {
  schema: SchemaParseResult;
  setSchema: (schema: SchemaParseResult) => void;
  schemaText: string;
  setSchemaText: (text: string) => void;
  sampleData: SampleData[];
  setSampleData: (data: SampleData[]) => void;
  addSampleData: (data: SampleData) => void;
  removeSampleData: (tableName: string) => void;
}

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);

export const SchemaProvider = ({ children }: { children: ReactNode }) => {
  const [schema, setSchema] = useState<SchemaParseResult>({
    tables: [],
    relationships: []
  });
  const [schemaText, setSchemaText] = useState('');
  const [sampleData, setSampleData] = useState<SampleData[]>([]);

  const addSampleData = (data: SampleData) => {
    setSampleData(prev => {
      const filtered = prev.filter(d => d.tableName !== data.tableName);
      return [...filtered, data];
    });
  };

  const removeSampleData = (tableName: string) => {
    setSampleData(prev => prev.filter(d => d.tableName !== tableName));
  };

  return (
    <SchemaContext.Provider value={{
      schema, setSchema,
      schemaText, setSchemaText,
      sampleData, setSampleData, addSampleData, removeSampleData
    }}>
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
