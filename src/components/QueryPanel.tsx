import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  History,
  Star,
  Trash2,
  Copy,
  FileText,
  Clock,
  Bookmark,
  ChevronRight,
  Wand2,
  X,
} from 'lucide-react';
import {
  getQueryHistory,
  getBookmarks,
  toggleBookmark,
  deleteHistoryItem,
  clearHistory,
  formatTimestamp,
  queryTemplates,
  getTemplateCategories,
  getTemplatesByCategory,
  QueryHistoryItem,
} from '@/lib/queryManager';
import { toast } from 'sonner';

interface QueryPanelProps {
  onSelectQuery: (prompt: string) => void;
  onSelectSQL: (sql: string) => void;
}

export const QueryPanel = ({ onSelectQuery, onSelectSQL }: QueryPanelProps) => {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<QueryHistoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  const refreshData = () => {
    setHistory(getQueryHistory());
    setBookmarks(getBookmarks());
  };

  useEffect(() => {
    refreshData();
  }, [isOpen]);

  const handleToggleBookmark = (id: string) => {
    const isNowBookmarked = toggleBookmark(id);
    refreshData();
    toast.success(isNowBookmarked ? 'Added to bookmarks' : 'Removed from bookmarks');
  };

  const handleDelete = (id: string) => {
    deleteHistoryItem(id);
    refreshData();
    toast.success('Query deleted');
  };

  const handleClearHistory = () => {
    clearHistory();
    refreshData();
    toast.success('History cleared (bookmarks preserved)');
  };

  const handleSelectHistoryItem = (item: QueryHistoryItem) => {
    onSelectQuery(item.prompt);
    onSelectSQL(item.sql);
    setIsOpen(false);
    toast.success('Query loaded');
  };

  const handleSelectTemplate = (prompt: string) => {
    onSelectQuery(prompt);
    setIsOpen(false);
    toast.success('Template loaded');
  };

  const categories = getTemplateCategories();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <History className="w-4 h-4 mr-2" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Query Library</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="history" className="flex-1">
              <Clock className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="flex-1">
              <Bookmark className="w-4 h-4 mr-2" />
              Bookmarks
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-muted-foreground">
                {history.length} queries
              </span>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <ScrollArea className="h-[400px]">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No query history yet</p>
                  <p className="text-xs mt-1">Generated queries will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <HistoryItem
                      key={item.id}
                      item={item}
                      onSelect={() => handleSelectHistoryItem(item)}
                      onToggleBookmark={() => handleToggleBookmark(item.id)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="bookmarks" className="mt-4">
            <ScrollArea className="h-[400px]">
              {bookmarks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No bookmarks yet</p>
                  <p className="text-xs mt-1">Star queries to save them here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((item) => (
                    <HistoryItem
                      key={item.id}
                      item={item}
                      onSelect={() => handleSelectHistoryItem(item)}
                      onToggleBookmark={() => handleToggleBookmark(item.id)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category}>
                    <button
                      onClick={() =>
                        setSelectedCategory(
                          selectedCategory === category ? '' : category
                        )
                      }
                      className="flex items-center gap-2 w-full text-left font-medium text-sm py-2 hover:text-primary"
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          selectedCategory === category ? 'rotate-90' : ''
                        }`}
                      />
                      {category}
                      <span className="text-xs text-muted-foreground">
                        ({getTemplatesByCategory(category).length})
                      </span>
                    </button>
                    {selectedCategory === category && (
                      <div className="ml-6 space-y-2 mt-2">
                        {getTemplatesByCategory(category).map((template) => (
                          <div
                            key={template.id}
                            className="p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                            onClick={() => handleSelectTemplate(template.prompt)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">
                                {template.name}
                              </span>
                              <Wand2 className="w-3 h-3 text-primary" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {template.description}
                            </p>
                            <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-2">
                              {template.prompt}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const HistoryItem = ({
  item,
  onSelect,
  onToggleBookmark,
  onDelete,
}: {
  item: QueryHistoryItem;
  onSelect: () => void;
  onToggleBookmark: () => void;
  onDelete: () => void;
}) => (
  <div className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 cursor-pointer" onClick={onSelect}>
        <p className="text-sm font-medium line-clamp-1">{item.prompt}</p>
        <p className="text-xs font-mono text-muted-foreground line-clamp-2 mt-1">
          {item.sql}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>{formatTimestamp(item.timestamp)}</span>
          <span>•</span>
          <span className="uppercase">{item.dialect}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark();
          }}
        >
          <Star
            className={`w-3.5 h-3.5 ${
              item.isBookmarked ? 'fill-yellow-500 text-yellow-500' : ''
            }`}
          />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(item.sql);
            toast.success('SQL copied');
          }}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  </div>
);
