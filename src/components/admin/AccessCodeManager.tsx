import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Copy, Check, User, Mail } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AccessCode {
  id: string;
  code: string;
  duration_type: string;
  duration_hours: number;
  is_redeemed: boolean;
  redeemed_by: string | null;
  redeemed_at: string | null;
  access_expires_at: string | null;
  assigned_email: string | null;
  created_at: string;
}

const DURATION_OPTIONS = [
  { value: '1_hour', label: '1 Hour', hours: 1 },
  { value: '1_day', label: '1 Day', hours: 24 },
  { value: '1_week', label: '1 Week', hours: 168 },
  { value: '1_month', label: '1 Month', hours: 720 },
];

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TRIAL-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const AccessCodeManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<string>('1_day');
  const [assignedEmail, setAssignedEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [redeemerEmails, setRedeemerEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes((data || []) as AccessCode[]);

      // Fetch redeemer emails for redeemed codes
      const redeemedCodes = (data || []).filter(c => c.redeemed_by);
      if (redeemedCodes.length > 0) {
        const userIds = redeemedCodes.map(c => c.redeemed_by).filter(Boolean);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', userIds);
        
        if (profiles) {
          const emailMap: Record<string, string> = {};
          profiles.forEach(p => {
            emailMap[p.user_id] = p.email;
          });
          setRedeemerEmails(emailMap);
        }
      }
    } catch (error) {
      console.error('Error fetching access codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch access codes',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedDuration || !assignedEmail.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(assignedEmail.trim())) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const duration = DURATION_OPTIONS.find(d => d.value === selectedDuration);
      if (!duration) throw new Error('Invalid duration');

      const code = generateCode();
      
      const { error } = await supabase
        .from('access_codes')
        .insert({
          code,
          duration_type: duration.value,
          duration_hours: duration.hours,
          created_by: user?.id,
          assigned_email: assignedEmail.trim().toLowerCase(),
        });

      if (error) throw error;
      
      toast({
        title: 'Code Created',
        description: `Access code "${code}" created for ${assignedEmail.trim()}`,
      });
      
      setIsDialogOpen(false);
      setAssignedEmail('');
      fetchCodes();
    } catch (error) {
      console.error('Error creating access code:', error);
      toast({
        title: 'Error',
        description: 'Failed to create access code',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (code: AccessCode) => {
    if (!confirm(`Delete code "${code.code}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('access_codes')
        .delete()
        .eq('id', code.id);

      if (error) throw error;
      
      toast({
        title: 'Deleted',
        description: `Access code deleted`,
      });
      fetchCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete code',
        variant: 'destructive'
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getDurationLabel = (type: string) => {
    return DURATION_OPTIONS.find(d => d.value === type)?.label || type;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Trial Access Codes
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate codes for trial access periods
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Generate Code
        </Button>
      </div>

      {/* Codes List */}
      {codes.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No access codes yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first trial access code
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Generate Code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {codes.map((code) => (
            <Card key={code.id} className={`bg-card border-border ${code.is_redeemed ? 'opacity-60' : ''}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Code Badge */}
                    <div className={`px-4 py-2 rounded-lg font-mono font-bold text-lg ${
                      code.is_redeemed 
                        ? 'bg-muted text-muted-foreground' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {code.code}
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-secondary" />
                      <span className="font-medium text-secondary">
                        {getDurationLabel(code.duration_type)}
                      </span>
                    </div>

                    {/* Status */}
                    {code.is_redeemed ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full bg-secondary/10 text-secondary text-xs">
                          Redeemed
                        </span>
                        {code.redeemed_by && redeemerEmails[code.redeemed_by] && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {redeemerEmails[code.redeemed_by]}
                          </span>
                        )}
                        {code.access_expires_at && (
                          <span className="text-xs text-muted-foreground">
                            Expires: {new Date(code.access_expires_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs">
                          Available
                        </span>
                        {code.assigned_email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            For: {code.assigned_email}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!code.is_redeemed && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyCode(code.code)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {copiedCode === code.code ? (
                          <Check className="w-4 h-4 text-secondary" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(code)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Generate Trial Access Code</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Recipient Email <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                placeholder="winner@example.com"
                value={assignedEmail}
                onChange={(e) => setAssignedEmail(e.target.value)}
                className="bg-muted/30 border-border"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Only this email can redeem the code
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Access Duration
              </label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger className="bg-muted/30 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !assignedEmail.trim()}>
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                'Generate Code'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessCodeManager;
