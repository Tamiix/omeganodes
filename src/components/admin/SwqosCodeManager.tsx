import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Check, Sparkles, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SwqosCode {
  id: string;
  code: string;
  stake_packages: number;
  duration_days: number;
  price_usd: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SWQOS-';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

const SwqosCodeManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [codes, setCodes] = useState<SwqosCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [code, setCode] = useState(generateCode());
  const [stakePackages, setStakePackages] = useState(1);
  const [durationDays, setDurationDays] = useState(30);
  const [priceUsd, setPriceUsd] = useState(500);
  const [maxUses, setMaxUses] = useState<string>('');

  useEffect(() => { fetchCodes(); }, []);

  const fetchCodes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('swqos_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch codes', variant: 'destructive' });
    } else {
      setCodes((data || []) as SwqosCode[]);
    }
    setIsLoading(false);
  };

  const openCreateDialog = () => {
    setCode(generateCode());
    setStakePackages(1);
    setDurationDays(30);
    setPriceUsd(500);
    setMaxUses('');
    setIsDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!code.trim() || stakePackages < 1 || durationDays < 1 || priceUsd < 0) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('swqos_codes').insert({
      code: code.trim().toUpperCase(),
      stake_packages: stakePackages,
      duration_days: durationDays,
      price_usd: priceUsd,
      max_uses: maxUses ? parseInt(maxUses, 10) : null,
      created_by: user?.id,
    });
    setIsSubmitting(false);
    if (error) {
      toast({
        title: 'Error',
        description: error.message.includes('duplicate') ? 'Code already exists' : 'Failed to create code',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Code created', description: code.trim().toUpperCase() });
    setIsDialogOpen(false);
    fetchCodes();
  };

  const toggleActive = async (c: SwqosCode) => {
    const { error } = await supabase
      .from('swqos_codes')
      .update({ is_active: !c.is_active })
      .eq('id', c.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } else {
      fetchCodes();
    }
  };

  const handleDelete = async (c: SwqosCode) => {
    if (!confirm(`Delete code "${c.code}"?`)) return;
    const { error } = await supabase.from('swqos_codes').delete().eq('id', c.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted' });
      fetchCodes();
    }
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    setCopiedCode(c);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            SwQoS Codes
          </h2>
          <p className="text-sm text-muted-foreground">
            Custom stake / duration / price codes for SwQoS orders
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Generate Code
        </Button>
      </div>

      {codes.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No SwQoS codes yet</h3>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" /> Generate Code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {codes.map((c) => (
            <Card key={c.id} className={`bg-card border-border ${!c.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="px-4 py-2 rounded-lg font-mono font-bold text-lg bg-primary/10 text-primary">
                    {c.code}
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">
                      {c.stake_packages}× pkg ({(c.stake_packages * 100000).toLocaleString()} SOL)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${c.price_usd} • {c.duration_days} days
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Uses: {c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ''}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${c.is_active ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'}`}>
                    {c.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => copyCode(c.code)}>
                    {copiedCode === c.code ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(c)}>
                    <Power className={`w-4 h-4 ${c.is_active ? 'text-secondary' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Generate SwQoS Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium mb-2">Code</label>
              <div className="flex gap-2">
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" />
                <Button variant="outline" onClick={() => setCode(generateCode())}>Random</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">Stake Packages (1–10)</label>
                <Input type="number" min={1} max={10} value={stakePackages}
                  onChange={(e) => setStakePackages(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} />
                <p className="text-xs text-muted-foreground mt-1">{(stakePackages * 100000).toLocaleString()} SOL</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duration (days)</label>
                <Input type="number" min={1} value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Price (USD)</label>
                <Input type="number" min={0} step="0.01" value={priceUsd}
                  onChange={(e) => setPriceUsd(Math.max(0, parseFloat(e.target.value) || 0))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Uses (optional)</label>
                <Input type="number" min={1} placeholder="∞" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !code.trim()}>
              {isSubmitting ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SwqosCodeManager;
