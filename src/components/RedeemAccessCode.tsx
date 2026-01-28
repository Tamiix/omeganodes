import { useState } from 'react';
import { Gift, Clock, Check, AlertCircle } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';

interface RedeemedAccess {
  duration_type: string;
  duration_hours: number;
  access_expires_at: string;
}

const DURATION_LABELS: Record<string, string> = {
  '1_hour': '1 Hour',
  '1_day': '1 Day',
  '1_week': '1 Week',
  '1_month': '1 Month',
};

const RedeemAccessCode = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState<RedeemedAccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async () => {
    if (!code.trim() || !user) return;
    
    setIsRedeeming(true);
    setError(null);
    
    try {
      // First, check if code exists and is valid
      const { data: codeData, error: fetchError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('is_redeemed', false)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!codeData) {
        setError('Invalid or already redeemed code');
        return;
      }

      // Calculate expiration
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (codeData.duration_hours * 60 * 60 * 1000));

      // Redeem the code
      const { error: updateError } = await supabase
        .from('access_codes')
        .update({
          is_redeemed: true,
          redeemed_by: user.id,
          redeemed_at: now.toISOString(),
          access_expires_at: expiresAt.toISOString(),
        })
        .eq('id', codeData.id);

      if (updateError) throw updateError;

      setRedeemed({
        duration_type: codeData.duration_type,
        duration_hours: codeData.duration_hours,
        access_expires_at: expiresAt.toISOString(),
      });

      toast({
        title: '🎉 Code Redeemed!',
        description: `You now have ${DURATION_LABELS[codeData.duration_type]} of trial access`,
      });
      
    } catch (error) {
      console.error('Error redeeming code:', error);
      setError('Failed to redeem code. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const resetDialog = () => {
    setCode('');
    setRedeemed(null);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Gift className="w-4 h-4" />
          Redeem Code
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Redeem Access Code
          </DialogTitle>
        </DialogHeader>

        {redeemed ? (
          <div className="py-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Successfully Redeemed!
              </h3>
              <p className="text-muted-foreground mb-4">
                You've unlocked trial access
              </p>
              
              <Card className="bg-muted/30 border-border">
                <CardContent className="py-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="text-lg font-bold text-foreground">
                      {DURATION_LABELS[redeemed.duration_type]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Access expires: {new Date(redeemed.access_expires_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Button 
              className="w-full mt-6" 
              onClick={() => setIsOpen(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Enter your access code
              </label>
              <Input
                placeholder="TRIAL-XXXXXXXX"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                className="bg-muted/30 border-border font-mono text-center text-lg tracking-wider"
              />
              {error && (
                <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleRedeem}
              disabled={!code.trim() || isRedeeming}
            >
              {isRedeeming ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                'Redeem Code'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RedeemAccessCode;
