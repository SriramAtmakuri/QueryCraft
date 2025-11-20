import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, FileSpreadsheet, Trash2, Plus, X } from 'lucide-react';
import { useSchema, SampleData } from '@/context/SchemaContext';
import { toast } from 'sonner';

export const SampleDataUploader = () => {
  const { sampleData, addSampleData, removeSampleData } = useSchema();
  const [tableName, setTableName] = useState('');
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): { columns: string[]; rows: string[][] } | null => {
    const lines = text.trim().split('\n');
    if (lines.length < 1) return null;

    const columns = lines[0].split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map(line => {
      // Handle quoted values with commas
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of line) {
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      return values;
    });

    return { columns, rows };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;

      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json) && json.length > 0) {
            const columns = Object.keys(json[0]);
            const rows = json.map(row => columns.map(col => String(row[col] ?? '')));
            const name = tableName || file.name.replace(/\.(json|csv)$/, '');

            addSampleData({ tableName: name, columns, rows });
            toast.success(`Uploaded ${rows.length} rows to "${name}"`);
            setTableName('');
            setCsvText('');
          }
        } catch {
          toast.error('Invalid JSON format');
        }
      } else {
        setCsvText(text);
        if (!tableName) {
          setTableName(file.name.replace(/\.(json|csv)$/, ''));
        }
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddData = () => {
    if (!tableName.trim()) {
      toast.error('Please enter a table name');
      return;
    }

    if (!csvText.trim()) {
      toast.error('Please enter CSV data or upload a file');
      return;
    }

    const parsed = parseCSV(csvText);
    if (!parsed || parsed.columns.length === 0) {
      toast.error('Invalid CSV format');
      return;
    }

    addSampleData({
      tableName: tableName.trim(),
      columns: parsed.columns,
      rows: parsed.rows
    });

    toast.success(`Added ${parsed.rows.length} rows to "${tableName}"`);
    setTableName('');
    setCsvText('');
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Sample Data
        </h3>

        <div className="space-y-3">
          <div>
            <Label htmlFor="tableName">Table Name</Label>
            <Input
              id="tableName"
              placeholder="e.g., users, orders"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
            />
          </div>

          <div>
            <Label>Upload CSV/JSON File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>

          <div>
            <Label htmlFor="csvData">Or Paste CSV Data</Label>
            <Textarea
              id="csvData"
              placeholder="id,name,email&#10;1,John,john@example.com&#10;2,Jane,jane@example.com"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="font-mono text-xs h-32"
            />
          </div>

          <Button onClick={handleAddData} className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Sample Data
          </Button>
        </div>
      </Card>

      {sampleData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Uploaded Data</h3>
          <div className="space-y-4">
            {sampleData.map((data) => (
              <div key={data.tableName} className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-3 py-2 flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">{data.tableName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {data.rows.length} rows
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSampleData(data.tableName)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="max-h-40 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {data.columns.map((col, idx) => (
                          <TableHead key={idx} className="text-xs py-1 px-2">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.slice(0, 5).map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <TableCell key={cellIdx} className="text-xs py-1 px-2">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {data.rows.length > 5 && (
                        <TableRow>
                          <TableCell
                            colSpan={data.columns.length}
                            className="text-xs py-1 px-2 text-center text-muted-foreground"
                          >
                            ... and {data.rows.length - 5} more rows
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
