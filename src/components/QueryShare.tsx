import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Share2, Copy, Download, Upload, Link, Check } from 'lucide-react';
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);

  const exportData: SharedQuery = {
    version: '1.0',
    query,
    sql,
    dialect,
    schema,
    timestamp: new Date().toISOString()
  };

  const handleCopyLink = () => {
    const encoded = btoa(JSON.stringify(exportData));
    const url = `${window.location.origin}/builder?shared=${encoded}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success('Shareable link copied to clipboard');
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
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
        <Button variant="outline" size="sm" className="h-8">
          <Share2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Query</DialogTitle>
          <DialogDescription>
            Export your query to share with others or import a shared query
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Export Section */}
          <Card className="p-4">
            <h4 className="text-sm font-semibold mb-3">Export Current Query</h4>
            {sql ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="w-full"
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                    ) : (
                      <Link className="w-4 h-4 mr-2" />
                    )}
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyJSON}
                    className="w-full"
                  >
                    {copiedJSON ? (
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy JSON
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownload}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download as File
                </Button>
                <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md max-h-[80px] overflow-auto">
                  <pre className="font-mono whitespace-pre-wrap break-all">
                    {sql.substring(0, 150)}{sql.length > 150 ? '...' : ''}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Generate a SQL query first to share it
              </p>
            )}
          </Card>

          {/* Import Section */}
          <Card className="p-4">
            <h4 className="text-sm font-semibold mb-3">Import Query</h4>
            <div className="space-y-3">
              <Textarea
                placeholder="Paste query JSON here..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="min-h-[80px] font-mono text-xs resize-none"
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleImport}
                disabled={!importData.trim()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Query
              </Button>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
