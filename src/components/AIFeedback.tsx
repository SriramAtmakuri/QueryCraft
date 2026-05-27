import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AIFeedbackProps {
  feature: 'semantic-diff' | 'schema-drift' | 'infer-migrations' | 'dialect-cost' | 'explain' | 'optimize' | 'debug' | 'generate';
  inputSummary?: string;
  outputSummary?: string;
}

export const AIFeedback = ({ feature, inputSummary, outputSummary }: AIFeedbackProps) => {
  const [voted, setVoted] = useState<1 | -1 | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (rating: 1 | -1) => {
    if (voted !== null || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.submitFeedback(feature, rating, inputSummary ?? '', outputSummary ?? '');
      setVoted(rating);
      toast.success(rating === 1 ? 'Thanks for the feedback!' : 'Noted — we\'ll improve this');
    } catch {
      toast.error('Could not submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <span className="text-xs text-muted-foreground mr-1">Helpful?</span>
      <Button
        variant="ghost"
        size="sm"
        className={`h-6 w-6 p-0 ${voted === 1 ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'}`}
        onClick={() => submit(1)}
        disabled={voted !== null || isSubmitting}
        title="Yes, helpful"
      >
        <ThumbsUp className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-6 w-6 p-0 ${voted === -1 ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
        onClick={() => submit(-1)}
        disabled={voted !== null || isSubmitting}
        title="Not helpful"
      >
        <ThumbsDown className="w-3 h-3" />
      </Button>
    </div>
  );
};
