import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useOfflineDetection() {
  const { toast } = useToast();

  useEffect(() => {
    const handleOffline = () => {
      toast({
        title: 'No internet connection',
        description: 'You are offline. Some features may not work.',
        variant: 'destructive',
        duration: 0
      });
    };

    const handleOnline = () => {
      toast({ title: 'Back online', description: 'Connection restored.' });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [toast]);
}
