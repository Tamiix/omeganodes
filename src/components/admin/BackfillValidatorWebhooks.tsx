import { useState } from 'react';
import { Radio, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const COUNT_OPTIONS = [3, 5, 10, 15, 20];

const BackfillValidatorWebhooks = () => {
  const { toast } = useToast();
  const [count, setCount] = useState<number>(5);
  const [fromEpoch, setFromEpoch] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current?: number } | null>(null);
  const [results, setResults] = useState<{ epoch: number; ok: boolean; error?: string }[]>([]);

  const resolveLatestEpoch = async (): Promise<number> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validator-stats?endpoint=validator`;
    const res = await fetch(url, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    const json = await res.json();
    const epoch = Number(json?.epoch);
    if (!epoch) throw new Error('Could not resolve current epoch');
    // Latest *completed* epoch is current - 1
    return epoch - 1;
  };

  const handleBackfill = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setResults([]);
    setProgress({ done: 0, total: count });

    try {
      let endEpoch: number;
      if (fromEpoch.trim()) {
        const parsed = Number(fromEpoch.trim());
        if (!Number.isInteger(parsed) || parsed <= 0) {
          throw new Error('From epoch must be a positive integer');
        }
        endEpoch = parsed;
      } else {
        endEpoch = await resolveLatestEpoch();
      }

      const epochs: number[] = [];
      for (let i = count - 1; i >= 0; i--) epochs.push(endEpoch - i);

      const collected: { epoch: number; ok: boolean; error?: string }[] = [];
      for (let i = 0; i < epochs.length; i++) {
        const ep = epochs[i];
        setProgress({ done: i, total: epochs.length, current: ep });
        try {
          const { data, error } = await supabase.functions.invoke('discord-validator-stats', {
            body: { target_epoch: ep },
          });
          if (error) throw error;
          if (data && (data as any).error) throw new Error((data as any).error);
          collected.push({ epoch: ep, ok: true });
        } catch (e: any) {
          collected.push({ epoch: ep, ok: false, error: e?.message || 'Failed' });
        }
        setResults([...collected]);
        // Light pacing to avoid Discord rate limits
        await new Promise((r) => setTimeout(r, 1200));
      }

      setProgress({ done: epochs.length, total: epochs.length });
      const successes = collected.filter((r) => r.ok).length;
      toast({
        title: 'Backfill complete',
        description: `${successes}/${epochs.length} epoch reports re-sent.`,
      });
    } catch (error: any) {
      toast({
        title: 'Backfill failed',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio className="w-4 h-4 text-primary" />
          Backfill Validator Discord Webhooks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Re-sends epoch reports to both Discord webhooks using the corrected epoch/delta mapping.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Number of epochs</Label>
            <Select
              value={String(count)}
              onValueChange={(v) => setCount(Number(v))}
              disabled={isRunning}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Last {n} epochs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">From epoch (optional)</Label>
            <Input
              type="number"
              placeholder="Auto: latest completed"
              value={fromEpoch}
              onChange={(e) => setFromEpoch(e.target.value)}
              disabled={isRunning}
              className="bg-background border-border"
            />
          </div>
        </div>

        <Button onClick={handleBackfill} disabled={isRunning} className="w-full">
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {progress
                ? `Sending ${progress.done}/${progress.total}${progress.current ? ` — epoch ${progress.current}` : ''}`
                : 'Running...'}
            </>
          ) : (
            'Run backfill'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-auto rounded-md border border-border p-2 bg-background/50">
            {results.map((r) => (
              <div key={r.epoch} className="flex items-center justify-between text-xs">
                <span className="font-mono">Epoch {r.epoch}</span>
                {r.ok ? (
                  <span className="text-emerald-400">✓ sent</span>
                ) : (
                  <span className="text-red-400 truncate max-w-[60%]" title={r.error}>
                    ✗ {r.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BackfillValidatorWebhooks;
