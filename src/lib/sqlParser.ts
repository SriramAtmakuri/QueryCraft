export interface TableColumn {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface TableSchema {
  name: string;
  columns: TableColumn[];
}

export interface SchemaParseResult {
  tables: TableSchema[];
  relationships: Array<{
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
  }>;
}

export function parseSQLSchema(sql: string): SchemaParseResult {
  const tables: TableSchema[] = [];
  const relationships: SchemaParseResult['relationships'] = [];

  // Match CREATE TABLE statements
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\);/gi;

  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnsBlock = match[2];

    const columns: TableColumn[] = [];
    const lines = columnsBlock.split(',').map(line => line.trim()).filter(line => line);

    for (const line of lines) {
      // Skip constraint definitions
      if (/^\s*(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)/i.test(line)) {
        // Parse FOREIGN KEY constraints
        const fkMatch = line.match(/FOREIGN\s+KEY\s*\([`"]?(\w+)[`"]?\)\s*REFERENCES\s+[`"]?(\w+)[`"]?\s*\([`"]?(\w+)[`"]?\)/i);
        if (fkMatch) {
          const [, fromColumn, toTable, toColumn] = fkMatch;
          relationships.push({
            fromTable: tableName,
            fromColumn,
            toTable,
            toColumn
          });
          // Mark the column as foreign key
          const col = columns.find(c => c.name === fromColumn);
          if (col) {
            col.isForeignKey = true;
            col.references = { table: toTable, column: toColumn };
          }
        }
        continue;
      }

      // Parse column definition
      const colMatch = line.match(/^[`"]?(\w+)[`"]?\s+(\w+(?:\([^)]+\))?)/i);
      if (colMatch) {
        const [, colName, colType] = colMatch;
        const isPrimaryKey = /PRIMARY\s+KEY/i.test(line);
        const isForeignKey = /REFERENCES/i.test(line);

        const column: TableColumn = {
          name: colName,
          type: colType.toUpperCase(),
          isPrimaryKey,
          isForeignKey
        };

        // Parse inline REFERENCES
        if (isForeignKey) {
          const refMatch = line.match(/REFERENCES\s+[`"]?(\w+)[`"]?\s*\([`"]?(\w+)[`"]?\)/i);
          if (refMatch) {
            column.references = { table: refMatch[1], column: refMatch[2] };
            relationships.push({
              fromTable: tableName,
              fromColumn: colName,
              toTable: refMatch[1],
              toColumn: refMatch[2]
            });
          }
        }

        columns.push(column);
      }
    }

    tables.push({ name: tableName, columns });
  }

  return { tables, relationships };
}

export function parseJSONSchema(json: string): SchemaParseResult {
  try {
    const data = JSON.parse(json);
    const tables: TableSchema[] = [];
    const relationships: SchemaParseResult['relationships'] = [];

    if (Array.isArray(data.tables)) {
      for (const table of data.tables) {
        const columns: TableColumn[] = [];

        for (const col of table.columns || []) {
          const column: TableColumn = {
            name: col.name,
            type: col.type?.toUpperCase() || 'VARCHAR',
            isPrimaryKey: col.primaryKey || col.isPrimaryKey || false,
            isForeignKey: col.foreignKey || col.isForeignKey || false
          };

          if (col.references) {
            column.references = col.references;
            relationships.push({
              fromTable: table.name,
              fromColumn: col.name,
              toTable: col.references.table,
              toColumn: col.references.column
            });
          }

          columns.push(column);
        }

        tables.push({ name: table.name, columns });
      }
    }

    return { tables, relationships };
  } catch {
    return { tables: [], relationships: [] };
  }
}
