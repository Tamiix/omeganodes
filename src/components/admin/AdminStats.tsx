import { useState, useEffect } from 'react';
import { Users, ShieldCheck, Gift, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminStatsProps {
  totalUsers: number;
  adminCount: number;
}

const AdminStats = ({ totalUsers, adminCount }: AdminStatsProps) => {
  const [trialsEnabled, setTrialsEnabled] = useState(false);
  const [isLoadingTrials, setIsLoadingTrials] = useState(true);
  const [isUpdatingTrials, setIsUpdatingTrials] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTrialSetting = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'trials_enabled')
        .maybeSingle();
      
      if (!error && data?.value && typeof data.value === 'object' && 'enabled' in data.value) {
        setTrialsEnabled((data.value as { enabled: boolean }).enabled);
      }
      setIsLoadingTrials(false);
    };
    fetchTrialSetting();
  }, []);

  const handleTrialsToggle = async (enabled: boolean) => {
    setIsUpdatingTrials(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: { enabled } })
        .eq('key', 'trials_enabled');

      if (error) throw error;

      setTrialsEnabled(enabled);
      toast({
        title: enabled ? 'Trials Enabled' : 'Trials Disabled',
        description: enabled 
          ? 'Users can now access free trials.' 
          : 'Free trials are now hidden from users.',
      });
    } catch (error) {
      console.error('Error updating trial setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update trial setting.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingTrials(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-3xl font-bold text-foreground">{totalUsers}</p>
            </div>
            <Users className="w-10 h-10 text-primary/50" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-3xl font-bold text-foreground">{adminCount}</p>
            </div>
            <ShieldCheck className="w-10 h-10 text-primary/50" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Free Trials</p>
              <div className="flex items-center gap-3 mt-1">
                {isLoadingTrials ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Switch 
                      checked={trialsEnabled} 
                      onCheckedChange={handleTrialsToggle}
                      disabled={isUpdatingTrials}
                    />
                    <span className={`text-sm font-medium ${trialsEnabled ? 'text-secondary' : 'text-muted-foreground'}`}>
                      {trialsEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <Gift className={`w-10 h-10 ${trialsEnabled ? 'text-secondary/50' : 'text-muted-foreground/30'}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStats;
