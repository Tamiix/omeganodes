import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Users, UserCheck, Mail, Loader2, User, Tag, Percent, Sparkles, Code, CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/admin/AdminHeader';

type Audience = 'single' | 'all' | 'active' | 'inactive';
type TemplateType = 'discount' | 'announcement' | 'custom' | null;

const LOGO_URL = 'https://mmkornqvbafkricqixgk.supabase.co/storage/v1/object/public/email-assets/omega-logo-new.png';

const wrapHtml = (content: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
</style>
</head>
<body style="margin:0;padding:0;background-color:#0a0a14;font-family:'Inter',system-ui,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:48px 32px;">

<!-- Logo -->
<img src="${LOGO_URL}" width="36" height="36" alt="OmegaNodes" style="display:block;margin-bottom:32px;" />

${content}

<!-- Footer -->
<div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
<p style="font-size:11px;color:#555;margin:0;">OmegaNodes &middot; Solana Node Infrastructure</p>
</div>

</div></body></html>`;

interface DiscountState {
  sharedCode: string;
  sharedDiscount: string;
  dedicatedCode: string;
  dedicatedDiscount: string;
  swqosCode: string;
  swqosDiscount: string;
  shredsCode: string;
  shredsDiscount: string;
}

interface ContentFields {
  headline: string;
  message: string;
  buttonText: string;
  buttonUrl: string;
}

const buildDiscountHtml = (d: DiscountState, fields: ContentFields) => {
  const codeCard = (label: string, detail: string, code: string) => `
<div style="background:linear-gradient(135deg,#13132a 0%,#1a1a35 100%);border:1px solid rgba(91,78,228,0.2);border-radius:12px;padding:20px 24px;margin-bottom:12px;">
  <p style="font-size:14px;font-weight:600;color:#fff;margin:0 0 12px;">${label}${detail ? ` &mdash; ${detail}` : ''}</p>
  <p style="font-size:10px;font-weight:600;color:#6b6b8a;margin:0 0 6px;text-transform:uppercase;letter-spacing:1.5px;">Discount code</p>
  <p style="font-size:28px;font-weight:800;color:#7C6FF7;margin:0;letter-spacing:4px;font-family:'JetBrains Mono',monospace;">${code.toUpperCase()}</p>
</div>`;

  const sharedBlock = d.sharedCode ? codeCard('Shared Servers', d.sharedDiscount, d.sharedCode) : '';
  const dedicatedBlock = d.dedicatedCode ? codeCard('Dedicated Servers', d.dedicatedDiscount, d.dedicatedCode) : '';
  const swqosBlock = d.swqosCode ? codeCard('swQoS Stake', d.swqosDiscount, d.swqosCode) : '';
  const shredsBlock = d.shredsCode ? codeCard('Private Shreds', d.shredsDiscount, d.shredsCode) : '';

  return wrapHtml(`
<h1 style="font-size:26px;font-weight:800;color:#ffffff;margin:0 0 12px;line-height:1.2;">${fields.headline}</h1>
<p style="font-size:15px;color:#8a8aa3;line-height:1.7;margin:0 0 28px;">${fields.message}</p>
<div style="margin-bottom:28px;">${sharedBlock}${dedicatedBlock}${swqosBlock}${shredsBlock}</div>
<a href="${fields.buttonUrl}" style="display:inline-block;background:linear-gradient(135deg,#5B4EE4,#7C6FF7);color:#fff;font-size:14px;font-weight:600;border-radius:10px;padding:14px 32px;text-decoration:none;box-shadow:0 4px 20px rgba(91,78,228,0.35);">${fields.buttonText}</a>`);
};

const buildGenericHtml = (fields: ContentFields) => {
  return wrapHtml(`
<h1 style="font-size:26px;font-weight:800;color:#ffffff;margin:0 0 12px;line-height:1.2;">${fields.headline}</h1>
<p style="font-size:15px;color:#8a8aa3;line-height:1.7;margin:0 0 28px;">${fields.message.replace(/\n/g, '<br/>')}</p>
<a href="${fields.buttonUrl}" style="display:inline-block;background:linear-gradient(135deg,#5B4EE4,#7C6FF7);color:#fff;font-size:14px;font-weight:600;border-radius:10px;padding:14px 32px;text-decoration:none;box-shadow:0 4px 20px rgba(91,78,228,0.35);">${fields.buttonText}</a>`);
};

const templateDefaults: Record<string, { subject: string; fields: ContentFields; discount?: DiscountState }> = {
  discount: {
    subject: 'Limited-time discount on OmegaNodes',
    fields: {
      headline: 'Save on your next plan',
      message: "We're running a limited-time discount on our Solana node plans. Use the codes below at checkout to save.",
      buttonText: 'View Plans',
      buttonUrl: 'https://omeganodes.io/#pricing',
    },
    discount: { sharedCode: '', sharedDiscount: '', dedicatedCode: '', dedicatedDiscount: '', swqosCode: '', swqosDiscount: '', shredsCode: '', shredsDiscount: '' },
  },
  announcement: {
    subject: 'News from OmegaNodes',
    fields: {
      headline: 'Something new is here',
      message: "We've been working on something exciting and we're ready to share it with you.",
      buttonText: 'Check It Out',
      buttonUrl: 'https://omeganodes.io',
    },
  },
  custom: {
    subject: '',
    fields: {
      headline: 'Your headline here',
      message: 'Write your message here. Keep it short and direct.',
      buttonText: 'Call to Action',
      buttonUrl: 'https://omeganodes.io',
    },
  },
};

const AdminEmails = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [subject, setSubject] = useState('');
  const [fromName, setFromName] = useState('OmegaNodes');
  const [audience, setAudience] = useState<Audience>('single');
  const [singleEmail, setSingleEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState({ all: 0, active: 0, inactive: 0 });
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  const [fields, setFields] = useState<ContentFields>({
    headline: '', message: '', buttonText: '', buttonUrl: '',
  });
  const [discount, setDiscount] = useState<DiscountState>({
    sharedCode: '', sharedDiscount: '', dedicatedCode: '', dedicatedDiscount: '', swqosCode: '', swqosDiscount: '', shredsCode: '', shredsDiscount: '',
  });

  // Queue status tracking
  const [queueStatus, setQueueStatus] = useState<{ pending: number; sending: number; sent: number; failed: number; total: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [failedEmails, setFailedEmails] = useState<{ id: string; recipient: string; error: string | null; created_at: string }[]>([]);
  const [showFailed, setShowFailed] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchQueueStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select('status');
      if (error) throw error;
      if (!data || data.length === 0) {
        setQueueStatus(null);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        return;
      }
      const counts = { pending: 0, sending: 0, sent: 0, failed: 0, total: data.length };
      data.forEach((r: any) => {
        if (r.status === 'pending') counts.pending++;
        else if (r.status === 'sending') counts.sending++;
        else if (r.status === 'sent') counts.sent++;
        else if (r.status === 'failed') counts.failed++;
      });
      setQueueStatus(counts);
      // Stop polling when queue is fully processed
      if (counts.pending === 0 && counts.sending === 0 && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (err) {
      console.error('Error fetching queue status:', err);
    }
  }, []);

  const fetchFailedEmails = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select('id, recipient, error, created_at')
        .eq('status', 'failed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFailedEmails(data || []);
    } catch (err) {
      console.error('Error fetching failed emails:', err);
    }
  }, []);

  const retryOneEmail = async (id: string) => {
    setRetryingId(id);
    try {
      const { error } = await supabase
        .from('email_queue')
        .update({ status: 'pending', error: null } as any)
        .eq('id', id);
      if (error) throw error;
      setFailedEmails(prev => prev.filter(e => e.id !== id));
      toast({ title: 'Re-queued', description: 'Email will be retried shortly.' });
      startPolling();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to retry email.', variant: 'destructive' });
    } finally {
      setRetryingId(null);
    }
  };

  const startPolling = useCallback(() => {
    fetchQueueStatus();
    fetchFailedEmails();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => { fetchQueueStatus(); fetchFailedEmails(); }, 5000);
  }, [fetchQueueStatus, fetchFailedEmails]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

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
    if (user && isAdmin) {
      fetchRecipientCounts();
      fetchFailedEmails();
      fetchQueueStatus().then(() => {
        if (pollRef.current === null) {
          startPolling();
        }
      });
    }
  }, [user, isAdmin]);

  // Rebuild HTML whenever fields or discount codes change
  useEffect(() => {
    if (!selectedTemplate || showHtml) return;
    if (selectedTemplate === 'discount') {
      setHtmlContent(buildDiscountHtml(discount, fields));
    } else {
      setHtmlContent(buildGenericHtml(fields));
    }
  }, [fields, discount, selectedTemplate, showHtml]);

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
        if (o.is_test_order || o.commitment === 'trial' || o.payment_method === 'trial_code' || o.commitment === 'daily') return;
        if (o.expires_at && new Date(o.expires_at) < now) return;
        activeUserIds.add(o.user_id);
      });

      const allCount = profilesRes.data?.length || 0;
      setRecipientCount({ all: allCount, active: activeUserIds.size, inactive: allCount - activeUserIds.size });
    } catch (err) {
      console.error('Error fetching recipient counts:', err);
    }
  };

  const getRecipients = async (): Promise<string[]> => {
    if (audience === 'single') return [singleEmail.trim()];

    const [profilesRes, ordersRes] = await Promise.all([
      supabase.from('profiles').select('user_id, email'),
      supabase.from('orders').select('user_id, status, is_test_order, commitment, payment_method, expires_at').in('status', ['completed', 'active']),
    ]);
    if (profilesRes.error) throw profilesRes.error;
    if (ordersRes.error) throw ordersRes.error;

    const now = new Date();
    const activeUserIds = new Set<string>();
    (ordersRes.data || []).forEach(o => {
      if (o.is_test_order || o.commitment === 'trial' || o.payment_method === 'trial_code' || o.commitment === 'daily') return;
      if (o.expires_at && new Date(o.expires_at) < now) return;
      activeUserIds.add(o.user_id);
    });

    const profiles = profilesRes.data || [];
    if (audience === 'all') return profiles.map(p => p.email);
    if (audience === 'active') return profiles.filter(p => activeUserIds.has(p.user_id)).map(p => p.email);
    return profiles.filter(p => !activeUserIds.has(p.user_id)).map(p => p.email);
  };

  const selectTemplate = (type: TemplateType) => {
    if (!type) return;
    const defaults = templateDefaults[type];
    setSelectedTemplate(type);
    setSubject(defaults.subject);
    setFields({ ...defaults.fields });
    if (type === 'discount' && defaults.discount) {
      setDiscount({ ...defaults.discount });
    }
    setShowHtml(false);
  };

  const updateField = (key: keyof ContentFields, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const updateDiscount = (key: keyof DiscountState, value: string) => {
    setDiscount(prev => ({ ...prev, [key]: value }));
  };

  const handleSend = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      toast({ title: 'Missing fields', description: 'Subject and content are required.', variant: 'destructive' });
      return;
    }
    if (audience === 'single' && !singleEmail.trim()) {
      toast({ title: 'Missing email', description: 'Enter a recipient email address.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const recipients = await getRecipients();
      if (recipients.length === 0) {
        toast({ title: 'No recipients', description: 'No users match the selected audience.', variant: 'destructive' });
        setIsSending(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-promotional-email', {
        body: { subject, htmlContent, recipients, fromName },
      });
      if (error) throw error;

      toast({ title: 'Emails queued!', description: `${data.queued} emails queued. They'll be sent in batches of 10 per minute.` });
      startPolling();
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

  const currentRecipientCount = audience === 'single' ? (singleEmail.trim() ? 1 : 0) : recipientCount[audience];
  const canSend = subject.trim() && htmlContent.trim() && (audience !== 'single' || singleEmail.trim());

  const templateCards: { type: TemplateType; label: string; desc: string; icon: React.ReactNode }[] = [
    { type: 'discount', label: 'Discount Launch', desc: 'Separate codes for Shared & Dedicated.', icon: <Percent className="w-4 h-4" /> },
    { type: 'announcement', label: 'Announcement', desc: 'Share news with a clean layout.', icon: <Sparkles className="w-4 h-4" /> },
    { type: 'custom', label: 'Custom', desc: 'Blank branded template.', icon: <Mail className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl space-y-6">
        {/* Queue Status */}
        {queueStatus && queueStatus.total > 0 && (
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {queueStatus.pending > 0 || queueStatus.sending > 0 ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : queueStatus.failed > 0 ? (
                    <XCircle className="w-4 h-4 text-destructive" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {queueStatus.pending > 0 || queueStatus.sending > 0
                      ? 'Sending emails...'
                      : queueStatus.failed > 0
                        ? `Done - ${queueStatus.failed} failed`
                        : 'All emails sent!'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {queueStatus.sent + queueStatus.failed} / {queueStatus.total}
                </span>
              </div>
              <Progress value={((queueStatus.sent + queueStatus.failed) / queueStatus.total) * 100} className="h-2" />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {queueStatus.pending + queueStatus.sending} pending</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> {queueStatus.sent} sent</span>
              {queueStatus.failed > 0 && (
                   <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-destructive" /> {queueStatus.failed} failed</span>
                 )}
               </div>
               {/* Retry / Clear buttons when queue is done */}
               {queueStatus.pending === 0 && queueStatus.sending === 0 && (
                 <div className="flex gap-2 pt-1">
                   {queueStatus.failed > 0 && (
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={async () => {
                         try {
                           const { error } = await supabase
                             .from('email_queue')
                             .update({ status: 'pending', error: null } as any)
                             .eq('status', 'failed');
                           if (error) throw error;
                           toast({ title: 'Retrying', description: `${queueStatus.failed} failed emails re-queued.` });
                           startPolling();
                         } catch (err) {
                           console.error(err);
                           toast({ title: 'Error', description: 'Failed to retry emails.', variant: 'destructive' });
                         }
                       }}
                     >
                       <Send className="w-3 h-3 mr-1" /> Retry {queueStatus.failed} failed
                     </Button>
                   )}
                   <Button
                     size="sm"
                     variant="ghost"
                     className="text-muted-foreground"
                     onClick={async () => {
                       try {
                         const { error } = await supabase
                           .from('email_queue')
                           .delete()
                           .in('status', ['sent', 'failed']);
                         if (error) throw error;
                         setQueueStatus(null);
                         toast({ title: 'Cleared', description: 'Queue history cleared.' });
                       } catch (err) {
                         console.error(err);
                         toast({ title: 'Error', description: 'Failed to clear queue.', variant: 'destructive' });
                       }
                     }}
                   >
                     Clear history
                   </Button>
                 </div>
               )}
             </CardContent>
           </Card>
        )}

        {/* Failed Emails Detail */}
        {failedEmails.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowFailed(!showFailed)}>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <XCircle className="w-4 h-4 text-destructive" />
                  Failed Emails ({failedEmails.length})
                </CardTitle>
                {showFailed ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </CardHeader>
            {showFailed && (
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedEmails.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm font-mono">{item.recipient}</TableCell>
                        <TableCell className="text-xs text-destructive max-w-[300px] truncate">{item.error || 'Unknown error'}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={retryingId === item.id}
                            onClick={() => retryOneEmail(item.id)}
                            className="h-7 gap-1"
                          >
                            {retryingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Retry
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        )}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Start from a template</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {templateCards.map((t) => (
              <button
                key={t.type}
                onClick={() => selectTemplate(t.type)}
                className={`text-left p-4 rounded-lg border transition-all ${
                  selectedTemplate === t.type ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={selectedTemplate === t.type ? 'text-primary' : 'text-muted-foreground'}>{t.icon}</span>
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {selectedTemplate && (
          <>
            {/* Discount Codes */}
            {selectedTemplate === 'discount' && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <Tag className="w-4 h-4 text-primary" />
                    Discount Codes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3 p-4 rounded-lg border border-border bg-background">
                      <p className="text-sm font-medium text-foreground">Shared Servers</p>
                      <Input value={discount.sharedCode} onChange={(e) => updateDiscount('sharedCode', e.target.value)} placeholder="e.g. SHARED20" className="bg-card border-border font-mono uppercase" />
                      <Input value={discount.sharedDiscount} onChange={(e) => updateDiscount('sharedDiscount', e.target.value)} placeholder="e.g. 20% off" className="bg-card border-border text-sm" />
                    </div>
                    <div className="space-y-3 p-4 rounded-lg border border-border bg-background">
                      <p className="text-sm font-medium text-foreground">Dedicated Servers</p>
                      <Input value={discount.dedicatedCode} onChange={(e) => updateDiscount('dedicatedCode', e.target.value)} placeholder="e.g. DEDI15" className="bg-card border-border font-mono uppercase" />
                      <Input value={discount.dedicatedDiscount} onChange={(e) => updateDiscount('dedicatedDiscount', e.target.value)} placeholder="e.g. 15% off" className="bg-card border-border text-sm" />
                    </div>
                    <div className="space-y-3 p-4 rounded-lg border border-border bg-background">
                      <p className="text-sm font-medium text-foreground">swQoS Stake</p>
                      <Input value={discount.swqosCode} onChange={(e) => updateDiscount('swqosCode', e.target.value)} placeholder="e.g. STAKE10" className="bg-card border-border font-mono uppercase" />
                      <Input value={discount.swqosDiscount} onChange={(e) => updateDiscount('swqosDiscount', e.target.value)} placeholder="e.g. 10% off" className="bg-card border-border text-sm" />
                    </div>
                    <div className="space-y-3 p-4 rounded-lg border border-border bg-background">
                      <p className="text-sm font-medium text-foreground">Private Shreds</p>
                      <Input value={discount.shredsCode} onChange={(e) => updateDiscount('shredsCode', e.target.value)} placeholder="e.g. SHREDS15" className="bg-card border-border font-mono uppercase" />
                      <Input value={discount.shredsDiscount} onChange={(e) => updateDiscount('shredsDiscount', e.target.value)} placeholder="e.g. 15% off" className="bg-card border-border text-sm" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Leave a field empty to exclude that product from the email.</p>
                </CardContent>
              </Card>
            )}

            {/* Content Editor */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <Mail className="w-4 h-4 text-primary" />
                    Compose
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowHtml(!showHtml)} className="text-xs text-muted-foreground h-7 gap-1.5">
                    <Code className="w-3 h-3" />
                    {showHtml ? 'Visual Editor' : 'HTML'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Audience */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Audience</label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: 'single' as Audience, label: 'Single User', icon: <User className="w-3.5 h-3.5" />, count: null },
                      { key: 'all' as Audience, label: 'All Users', icon: <Users className="w-3.5 h-3.5" />, count: recipientCount.all },
                      { key: 'active' as Audience, label: 'Active Subs', icon: <UserCheck className="w-3.5 h-3.5" />, count: recipientCount.active },
                      { key: 'inactive' as Audience, label: 'No Sub', icon: <Users className="w-3.5 h-3.5" />, count: recipientCount.inactive },
                    ]).map((a) => (
                      <Button key={a.key} variant={audience === a.key ? 'default' : 'outline'} size="sm" onClick={() => setAudience(a.key)} className="gap-1.5">
                        {a.icon}
                        {a.label}{a.count !== null ? ` (${a.count})` : ''}
                      </Button>
                    ))}
                  </div>
                </div>

                {audience === 'single' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Recipient Email</label>
                    <Input type="email" value={singleEmail} onChange={(e) => setSingleEmail(e.target.value)} placeholder="user@example.com" className="bg-background border-border" />
                  </div>
                )}

                {/* From + Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">From Name</label>
                    <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="OmegaNodes" className="bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Subject Line</label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. 💰 Exclusive Discount" className="bg-background border-border" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Sent from: {fromName || 'OmegaNodes'} &lt;noreply@omegatest.xyz&gt;
                </p>

                {showHtml ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">HTML Source</label>
                    <Textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} rows={16} className="bg-background border-border font-mono text-xs" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Headline</label>
                      <Input value={fields.headline} onChange={(e) => updateField('headline', e.target.value)} placeholder="Your headline" className="bg-background border-border" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Message</label>
                      <Textarea value={fields.message} onChange={(e) => updateField('message', e.target.value)} rows={4} placeholder="Your message..." className="bg-background border-border" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Button Text</label>
                        <Input value={fields.buttonText} onChange={(e) => updateField('buttonText', e.target.value)} placeholder="e.g. View Plans" className="bg-background border-border" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Button URL</label>
                        <Input value={fields.buttonUrl} onChange={(e) => updateField('buttonUrl', e.target.value)} placeholder="https://omeganodes.io" className="bg-background border-border" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Preview */}
                {htmlContent.trim() && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Preview</label>
                    <div className="border border-border rounded-lg overflow-hidden" style={{ backgroundColor: '#0f0f1a' }}>
                      <iframe srcDoc={htmlContent} title="Email Preview" className="w-full border-0" style={{ height: '480px', pointerEvents: 'none' }} sandbox="" />
                    </div>
                  </div>
                )}

                {/* Send */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    {currentRecipientCount} {currentRecipientCount === 1 ? 'recipient' : 'recipients'}
                  </p>
                  <Button onClick={handleSend} disabled={isSending || !canSend} className="gap-1.5">
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminEmails;
