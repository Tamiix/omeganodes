import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Users, UserCheck, Mail, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Audience = 'all' | 'active' | 'inactive';

const AdminEmails = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [fromName, setFromName] = useState('OmegaNodes');
  const [audience, setAudience] = useState<Audience>('all');
  const [isSending, setIsSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<{ all: number; active: number; inactive: number }>({ all: 0, active: 0, inactive: 0 });
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate('/');
      else if (!isAdmin) {
        navigate('/dashboard');
        toast({ title: 'Access Denied', description: 'Admin access required.', variant: 'destructive' });
      }
    }
  }, [user, isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (user && isAdmin) fetchRecipientCounts();
  }, [user, isAdmin]);

  const fetchRecipientCounts = async () => {
    try {
      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('user_id, email'),
        supabase.from('orders').select('user_id, status, is_test_order, commitment, payment_method, expires_at').in('status', ['completed', 'active']),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const now = new Date();
      const activeUserIds = new Set<string>();

      (ordersRes.data || []).forEach(o => {
        if (o.is_test_order) return;
        if (o.commitment === 'trial' || o.payment_method === 'trial_code' || o.commitment === 'daily') return;
        if (o.expires_at && new Date(o.expires_at) < now) return;
        activeUserIds.add(o.user_id);
      });

      const allCount = profilesRes.data?.length || 0;
      const activeCount = activeUserIds.size;

      setRecipientCount({
        all: allCount,
        active: activeCount,
        inactive: allCount - activeCount,
      });
    } catch (err) {
      console.error('Error fetching recipient counts:', err);
    }
  };

  const getRecipients = async (): Promise<string[]> => {
    const [profilesRes, ordersRes] = await Promise.all([
      supabase.from('profiles').select('user_id, email'),
      supabase.from('orders').select('user_id, status, is_test_order, commitment, payment_method, expires_at').in('status', ['completed', 'active']),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (ordersRes.error) throw ordersRes.error;

    const now = new Date();
    const activeUserIds = new Set<string>();

    (ordersRes.data || []).forEach(o => {
      if (o.is_test_order) return;
      if (o.commitment === 'trial' || o.payment_method === 'trial_code' || o.commitment === 'daily') return;
      if (o.expires_at && new Date(o.expires_at) < now) return;
      activeUserIds.add(o.user_id);
    });

    const profiles = profilesRes.data || [];

    if (audience === 'all') return profiles.map(p => p.email);
    if (audience === 'active') return profiles.filter(p => activeUserIds.has(p.user_id)).map(p => p.email);
    return profiles.filter(p => !activeUserIds.has(p.user_id)).map(p => p.email);
  };

  const handleSend = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      toast({ title: 'Missing fields', description: 'Subject and content are required.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const recipients = await getRecipients();

      if (recipients.length === 0) {
        toast({ title: 'No recipients', description: 'No users match the selected audience.', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-promotional-email', {
        body: { subject, htmlContent, recipients, fromName },
      });

      if (error) throw error;

      toast({
        title: 'Emails sent!',
        description: `${data.sent} sent, ${data.failed} failed out of ${data.total} recipients.`,
      });

      if (data.failed > 0) {
        console.warn('Failed emails:', data.results.filter((r: any) => !r.success));
      }
    } catch (err) {
      console.error('Error sending emails:', err);
      toast({ title: 'Error', description: 'Failed to send emails.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const currentCount = recipientCount[audience];

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-3xl">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Mail className="w-5 h-5 text-primary" />
              Compose Promotional Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Audience Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Audience</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={audience === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAudience('all')}
                  className="gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  All Users ({recipientCount.all})
                </Button>
                <Button
                  variant={audience === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAudience('active')}
                  className="gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Active Subs ({recipientCount.active})
                </Button>
                <Button
                  variant={audience === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAudience('inactive')}
                  className="gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  No Sub ({recipientCount.inactive})
                </Button>
              </div>
            </div>

            {/* From Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">From Name</label>
              <Input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="OmegaNodes"
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Emails will be sent from: {fromName || 'OmegaNodes'} &lt;noreply@omegatest.xyz&gt;
              </p>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. 🎉 New Feature Launch!"
                className="bg-background border-border"
              />
            </div>

            {/* HTML Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Body (HTML)</label>
              <Textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<h1>Hello!</h1><p>Write your email content here...</p>"
                rows={12}
                className="bg-background border-border font-mono text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={!htmlContent.trim()} className="gap-1.5">
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Email Preview</DialogTitle>
                  </DialogHeader>
                  <div className="border border-border rounded-lg p-4 bg-white">
                    <div className="text-sm text-gray-500 mb-2">
                      <strong>Subject:</strong> {subject || '(no subject)'}
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleSend}
                disabled={isSending || !subject.trim() || !htmlContent.trim()}
                className="gap-1.5"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send to {currentCount} {currentCount === 1 ? 'user' : 'users'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminEmails;
