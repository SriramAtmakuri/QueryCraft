import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Share2, Copy, Download, Upload, Link } from 'lucide-react';
import { toast } from 'sonner';

interface QueryShareProps {
  query: string;
  sql: string;
  dialect: string;
  schema?: string;
}

interface SharedQuery {
  version: string;
  query: string;
  sql: string;
  dialect: string;
  schema?: string;
  timestamp: string;
}

export const QueryShare = ({ query, sql, dialect, schema }: QueryShareProps) => {
  const [importData, setImportData] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const exportData: SharedQuery = {
    version: '1.0',
    query,
    sql,
    dialect,
    schema,
    timestamp: new Date().toISOString()
  };

  const handleCopyLink = () => {
    // Encode query data in URL
    const encoded = btoa(JSON.stringify(exportData));
    const url = `${window.location.origin}/builder?shared=${encoded}`;
    navigator.clipboard.writeText(url);
    toast.success('Shareable link copied to clipboard');
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast.success('Query data copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Query exported');
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importData) as SharedQuery;
      if (!data.sql) {
        throw new Error('Invalid query data');
      }
      // Dispatch custom event to load the query
      window.dispatchEvent(new CustomEvent('loadSharedQuery', { detail: data }));
      setImportData('');
      setIsOpen(false);
      toast.success('Query imported successfully');
    } catch {
      toast.error('Invalid query data format');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Query</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Export Current Query</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                disabled={!sql}
                className="flex-1"
              >
                <Link className="w-3 h-3 mr-1" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJSON}
                disabled={!sql}
                className="flex-1"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!sql}
              >
                <Download className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Import Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Import Query</h4>
            <Textarea
              placeholder="Paste query JSON here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="min-h-[100px] font-mono text-xs"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleImport}
              disabled={!importData.trim()}
              className="w-full"
            >
              <Upload className="w-3 h-3 mr-1" />
              Import Query
            </Button>
          </div>

          {/* Current Query Preview */}
          {sql && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Query</h4>
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-[100px] overflow-auto">
                <pre className="font-mono">{sql.substring(0, 200)}{sql.length > 200 ? '...' : ''}</pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
