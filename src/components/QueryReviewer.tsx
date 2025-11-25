import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageSquare, Trash2, RefreshCw, User } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ReviewComment {
  id: string;
  lineStart: number;
  lineEnd: number;
  comment: string;
  author: string;
  createdAt: string;
}

interface QueryReviewerProps {
  shareId: string;
  sql: string;
  onClose?: () => void;
}

export const QueryReviewer = ({ shareId, sql, onClose }: QueryReviewerProps) => {
  const [reviews, setReviews] = useState<ReviewComment[]>([]);
  const [selectedLines, setSelectedLines] = useState<{ start: number; end: number } | null>(null);
  const [comment, setComment] = useState('');
  const [author, setAuthor] = useState(() => localStorage.getItem('qc_reviewer_name') || '');
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const selectionStartRef = useRef<number | null>(null);

  const lines = sql.split('\n');

  // fetchReviews is defined below; stable reference via function hoisting isn't available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReviews(); }, [shareId]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const data = await api.getReviews(shareId);
      setReviews(data);
    } catch {
      // shared query might not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const getLineReviews = (lineNum: number) =>
    reviews.filter(r => lineNum >= r.lineStart && lineNum <= r.lineEnd);

  const handleLineClick = (lineNum: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectionStartRef.current !== null) {
      const start = Math.min(selectionStartRef.current, lineNum);
      const end = Math.max(selectionStartRef.current, lineNum);
      setSelectedLines({ start, end });
    } else {
      selectionStartRef.current = lineNum;
      setSelectedLines({ start: lineNum, end: lineNum });
    }
    setShowCommentBox(true);
  };

  const handlePostComment = async () => {
    if (!comment.trim() || !selectedLines) return;
    const authorName = author.trim() || 'Anonymous';
    localStorage.setItem('qc_reviewer_name', authorName);
    setIsPosting(true);
    try {
      await api.addReview(shareId, selectedLines.start, selectedLines.end, comment, authorName);
      setComment('');
      setShowCommentBox(false);
      setSelectedLines(null);
      await fetchReviews();
      toast.success('Comment added');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await api.deleteReview(commentId);
      setReviews(prev => prev.filter(r => r.id !== commentId));
      toast.success('Comment deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const isLineSelected = (lineNum: number) =>
    selectedLines ? lineNum >= selectedLines.start && lineNum <= selectedLines.end : false;

  const isLineCommented = (lineNum: number) => getLineReviews(lineNum).length > 0;

  return (
    <div className="flex gap-4 h-[600px]">
      {/* SQL with line annotations */}
      <div className="flex-1 min-w-0">
        <Card className="h-full p-0 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <p className="text-sm font-medium">Query — click line to comment, shift+click to select range</p>
            <Badge variant="outline">{reviews.length} comment{reviews.length !== 1 ? 's' : ''}</Badge>
          </div>
          <ScrollArea className="h-[calc(100%-49px)]">
            <pre className="text-xs font-mono p-3 select-none">
              {lines.map((line, i) => {
                const lineNum = i + 1;
                const lineReviews = getLineReviews(lineNum);
                const selected = isLineSelected(lineNum);
                const commented = isLineCommented(lineNum);
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 px-1 py-0.5 rounded cursor-pointer group transition-colors
                      ${selected ? 'bg-primary/20' : commented ? 'bg-blue-500/10' : 'hover:bg-muted/50'}`}
                    onClick={(e) => handleLineClick(lineNum, e)}
                    title={`Line ${lineNum}${commented ? ` · ${lineReviews.length} comment(s)` : ''}`}
                  >
                    <span className="text-muted-foreground w-6 text-right flex-shrink-0 select-none">
                      {lineNum}
                    </span>
                    <span className="flex-1 whitespace-pre">{line || ' '}</span>
                    {commented && (
                      <MessageSquare className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </pre>
          </ScrollArea>
        </Card>
      </div>

      {/* Comments panel */}
      <div className="w-72 flex flex-col gap-3 flex-shrink-0">
        {/* Add comment box */}
        {showCommentBox && selectedLines && (
          <Card className="p-3 space-y-2">
            <p className="text-xs font-medium">
              Comment on line{selectedLines.start !== selectedLines.end ? `s ${selectedLines.start}–${selectedLines.end}` : ` ${selectedLines.start}`}
            </p>
            <Input
              placeholder="Your name (optional)"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              className="h-8 text-xs"
            />
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="min-h-[80px] text-xs resize-none"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePostComment();
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={handlePostComment}
                disabled={isPosting || !comment.trim()}
              >
                {isPosting ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Post'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowCommentBox(false); setSelectedLines(null); }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* All comments */}
        <Card className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <p className="text-sm font-medium">Comments</p>
            <Button variant="ghost" size="sm" onClick={fetchReviews} className="h-7 w-7 p-0">
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-49px)]">
            {reviews.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No comments yet.</p>
                <p className="text-xs">Click a line to add one.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {reviews.map(r => (
                  <div key={r.id} className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium">{r.author}</span>
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          L{r.lineStart}{r.lineStart !== r.lineEnd ? `–${r.lineEnd}` : ''}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.comment}</p>
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>Close Review</Button>
        )}
      </div>
    </div>
  );
};

interface QueryReviewModalProps {
  sql: string;
  query?: string;
  dialect?: string;
  schema?: string;
}

export const QueryReviewModal = ({ sql, query, dialect = 'postgresql', schema }: QueryReviewModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleOpen = async () => {
    if (!sql.trim()) {
      toast.error('Generate a SQL query first');
      return;
    }
    if (!shareId) {
      setIsCreating(true);
      try {
        const data = await api.createShare(sql, query, dialect, schema);
        setShareId(data.shareId);
        const url = `${window.location.origin}/builder?reviewId=${data.shareId}`;
        navigator.clipboard.writeText(url).catch(() => {});
        toast.success('Review link copied to clipboard');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to create share');
        setIsCreating(false);
        return;
      } finally {
        setIsCreating(false);
      }
    }
    setIsOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        disabled={isCreating || !sql.trim()}
        className="h-8"
      >
        {isCreating ? (
          <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
        ) : (
          <MessageSquare className="w-3 h-3 mr-2" />
        )}
        Review
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Collaborative Query Review
              {shareId && (
                <Badge variant="outline" className="text-xs font-mono ml-2">
                  ID: {shareId.slice(0, 8)}…
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {shareId && (
            <QueryReviewer
              shareId={shareId}
              sql={sql}
              onClose={() => setIsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
