import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

type Mode = 'login' | 'register' | 'forgot';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://querycraft-uaqy.onrender.com';

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();

  const reset = () => { setEmail(''); setPassword(''); setName(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        toast({ title: 'Welcome back!' });
        reset();
        onOpenChange(false);
      } else if (mode === 'register') {
        await register(email, password, name || undefined);
        toast({ title: 'Account created!' });
        reset();
        onOpenChange(false);
      } else {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        toast({ title: data.message || 'Check your email for a reset link.' });
        setMode('login');
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Something went wrong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, string> = { login: 'Sign in', register: 'Create account', forgot: 'Reset password' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1">
              <Label htmlFor="name">Name (optional)</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
          </div>
          {mode !== 'forgot' && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                {mode === 'login' && (
                  <button type="button" onClick={() => setMode('forgot')} className="text-xs text-muted-foreground underline hover:text-foreground">
                    Forgot password?
                  </button>
                )}
              </div>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'Min 8 characters' : ''} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
          </Button>
        </form>
        <div className="text-center text-sm text-muted-foreground space-y-1">
          {mode === 'login' && (
            <p>Don't have an account?{' '}
              <button type="button" onClick={() => { setMode('register'); reset(); }} className="underline hover:text-foreground">Sign up</button>
            </p>
          )}
          {mode !== 'login' && (
            <p>
              <button type="button" onClick={() => { setMode('login'); reset(); }} className="underline hover:text-foreground">Back to sign in</button>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
