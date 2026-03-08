import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Users, UserCheck, Mail, Loader2, Eye, User, Tag, Percent, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type Audience = 'single' | 'all' | 'active' | 'inactive';

interface EmailTemplate {
  id: string;
  label: string;
  icon: React.ReactNode;
  subject: string;
  body: string;
}

const LOGO_URL = 'https://mmkornqvbafkricqixgk.supabase.co/storage/v1/object/public/email-assets/omega-logo.png';

const buildHtml = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Inter',system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 28px;">
    <img src="${LOGO_URL}" width="40" height="40" alt="OmegaNodes" style="display:block;margin-bottom:28px;" />
    ${content}
    <p style="font-size:12px;color:#999;margin-top:40px;border-top:1px solid #eee;padding-top:20px;">
      OmegaNodes &mdash; Solana Node Infrastructure<br/>
      <a href="https://omeganodes.io" style="color:#5B4EE4;text-decoration:none;">omeganodes.io</a>
    </p>
  </div>
</body>
</html>`;

const codeBlockStyle = `background:#f4f3ff;border:1px solid #e0dff5;border-radius:8px;padding:16px;text-align:center;`;
const codeLabelStyle = `font-size:11px;color:#7f8494;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;`;
const codeValueStyle = `font-size:24px;font-weight:700;color:#5B4EE4;margin:0;letter-spacing:3px;font-family:'JetBrains Mono',monospace;`;
const planLabelStyle = `font-size:13px;font-weight:600;color:#1a1a2e;margin:0 0 2px;`;

const buildDiscountHtml = (sharedCode: string, dedicatedCode: string, sharedDiscount: string, dedicatedDiscount: string) => {
  const sharedBlock = sharedCode ? `
    <div style="${codeBlockStyle}margin-bottom:12px;">
      <p style="${planLabelStyle}">Shared Servers${sharedDiscount ? ` — ${sharedDiscount}` : ''}</p>
      <p style="${codeLabelStyle}">Discount code</p>
      <p style="${codeValueStyle}">${sharedCode.toUpperCase()}</p>
    </div>` : '';

  const dedicatedBlock = dedicatedCode ? `
    <div style="${codeBlockStyle}">
      <p style="${planLabelStyle}">Dedicated Servers${dedicatedDiscount ? ` — ${dedicatedDiscount}` : ''}</p>
      <p style="${codeLabelStyle}">Discount code</p>
      <p style="${codeValueStyle}">${dedicatedCode.toUpperCase()}</p>
    </div>` : '';

  return buildHtml(`
    <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Exclusive deal, just for you</h1>
    <p style="font-size:14px;color:#7f8494;line-height:1.6;margin:0 0 24px;">
      We're running a limited-time discount on our Solana node plans. Use the codes below at checkout to save.
    </p>
    <div style="margin-bottom:24px;">
      ${sharedBlock}
      ${dedicatedBlock}
    </div>
    <a href="https://omeganodes.io/#pricing" style="display:inline-block;background:#5B4EE4;color:#fff;font-size:14px;font-weight:600;border-radius:8px;padding:12px 24px;text-decoration:none;">View Plans</a>
  `);
};

const staticTemplates: EmailTemplate[] = [
  {
    id: 'announcement',
    label: 'Announcement',
    icon: <Sparkles className="w-4 h-4" />,
    subject: '🚀 Big News from OmegaNodes',
    body: buildHtml(`
      <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Something new is here</h1>
      <p style="font-size:14px;color:#7f8494;line-height:1.6;margin:0 0 24px;">
        We've been working on something exciting and we're ready to share it with you. Here's what's new:
      </p>
      <ul style="font-size:14px;color:#7f8494;line-height:1.8;margin:0 0 24px;padding-left:20px;">
        <li>Feature or update #1</li>
        <li>Feature or update #2</li>
        <li>Feature or update #3</li>
      </ul>
      <a href="https://omeganodes.io" style="display:inline-block;background:#5B4EE4;color:#fff;font-size:14px;font-weight:600;border-radius:8px;padding:12px 24px;text-decoration:none;">Check It Out</a>
    `),
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: <Mail className="w-4 h-4" />,
    subject: '',
    body: buildHtml(`
      <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Your headline here</h1>
      <p style="font-size:14px;color:#7f8494;line-height:1.6;margin:0 0 24px;">
        Write your message here. Keep it short and direct.
      </p>
      <a href="https://omeganodes.io" style="display:inline-block;background:#5B4EE4;color:#fff;font-size:14px;font-weight:600;border-radius:8px;padding:12px 24px;text-decoration:none;">Call to Action</a>
    `),
  },
];

const AdminEmails = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [fromName, setFromName] = useState('OmegaNodes');
  const [audience, setAudience] = useState<Audience>('single');
  const [singleEmail, setSingleEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState({ all: 0, active: 0, inactive: 0 });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [sharedCode, setSharedCode] = useState('');
  const [dedicatedCode, setDedicatedCode] = useState('');
  const [sharedDiscount, setSharedDiscount] = useState('');
  const [dedicatedDiscount, setDedicatedDiscount] = useState('');

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
    if (audience === 'single') {
      return [singleEmail.trim()];
    }

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

  const applyTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template.id);
    setSubject(template.subject);
    setHtmlContent(template.body);
    setShowHtml(false);
  };

  const applyDiscountTemplate = () => {
    setSelectedTemplate('discount');
    setSubject('💰 Exclusive Discount on OmegaNodes');
    setHtmlContent(buildDiscountHtml(sharedCode, dedicatedCode, sharedDiscount, dedicatedDiscount));
    setShowHtml(false);
  };

  // Re-generate discount HTML when codes change
  useEffect(() => {
    if (selectedTemplate === 'discount') {
      setHtmlContent(buildDiscountHtml(sharedCode, dedicatedCode, sharedDiscount, dedicatedDiscount));
    }
  }, [sharedCode, dedicatedCode, sharedDiscount, dedicatedDiscount, selectedTemplate]);

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

  const currentRecipientCount = audience === 'single' ? (singleEmail.trim() ? 1 : 0) : recipientCount[audience];
  const canSend = subject.trim() && htmlContent.trim() && (audience !== 'single' || singleEmail.trim());

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl space-y-6">
        {/* Templates */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Start from a template</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Discount template card */}
            <button
              onClick={() => applyDiscountTemplate()}
              className={`text-left p-4 rounded-lg border transition-all ${
                selectedTemplate === 'discount'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={selectedTemplate === 'discount' ? 'text-primary' : 'text-muted-foreground'}><Percent className="w-4 h-4" /></span>
                <span className="text-sm font-medium text-foreground">Discount Launch</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                Separate codes for Shared and Dedicated servers.
              </p>
            </button>
            {/* Other templates */}
            {staticTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className={`text-left p-4 rounded-lg border transition-all ${
                  selectedTemplate === t.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={selectedTemplate === t.id ? 'text-primary' : 'text-muted-foreground'}>{t.icon}</span>
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {t.id === 'announcement' && 'Clean announcement with feature list and button.'}
                  {t.id === 'custom' && 'Blank branded template. Write your own content.'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Discount Code Inputs - shown when discount template is selected */}
        {selectedTemplate === 'discount' && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-foreground text-base">
                <Tag className="w-4 h-4 text-primary" />
                Discount Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3 p-4 rounded-lg border border-border bg-background">
                  <p className="text-sm font-medium text-foreground">Shared Servers</p>
                  <div className="space-y-2">
                    <Input
                      value={sharedCode}
                      onChange={(e) => setSharedCode(e.target.value)}
                      placeholder="e.g. SHARED20"
                      className="bg-card border-border font-mono uppercase"
                    />
                    <Input
                      value={sharedDiscount}
                      onChange={(e) => setSharedDiscount(e.target.value)}
                      placeholder="e.g. 20% off"
                      className="bg-card border-border text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-3 p-4 rounded-lg border border-border bg-background">
                  <p className="text-sm font-medium text-foreground">Dedicated Servers</p>
                  <div className="space-y-2">
                    <Input
                      value={dedicatedCode}
                      onChange={(e) => setDedicatedCode(e.target.value)}
                      placeholder="e.g. DEDI15"
                      className="bg-card border-border font-mono uppercase"
                    />
                    <Input
                      value={dedicatedDiscount}
                      onChange={(e) => setDedicatedDiscount(e.target.value)}
                      placeholder="e.g. 15% off"
                      className="bg-card border-border text-sm"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave a field empty to exclude that server type from the email.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Compose */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground text-base">
              <Mail className="w-4 h-4 text-primary" />
              Compose
            </CardTitle>
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
                  <Button
                    key={a.key}
                    variant={audience === a.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAudience(a.key)}
                    className="gap-1.5"
                  >
                    {a.icon}
                    {a.label}{a.count !== null ? ` (${a.count})` : ''}
                  </Button>
                ))}
              </div>
            </div>

            {audience === 'single' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Recipient Email</label>
                <Input
                  type="email"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="bg-background border-border"
                />
              </div>
            )}

            {/* From + Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">From Name</label>
                <Input
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="OmegaNodes"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. 💰 Exclusive Discount"
                  className="bg-background border-border"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground -mt-2">
              Sent from: {fromName || 'OmegaNodes'} &lt;noreply@omegatest.xyz&gt;
            </p>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Email Content</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHtml(!showHtml)}
                  className="text-xs text-muted-foreground h-7"
                >
                  {showHtml ? 'Hide HTML' : 'Edit HTML'}
                </Button>
              </div>
              {showHtml && (
                <Textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  rows={14}
                  className="bg-background border-border font-mono text-xs"
                />
              )}
            </div>

            {/* Live Preview */}
            {htmlContent.trim() && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Preview</label>
                <div
                  className="border border-border rounded-lg overflow-hidden"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <iframe
                    srcDoc={htmlContent}
                    title="Email Preview"
                    className="w-full border-0"
                    style={{ height: '420px', pointerEvents: 'none' }}
                    sandbox=""
                  />
                </div>
              </div>
            )}

            {/* Send */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {currentRecipientCount} {currentRecipientCount === 1 ? 'recipient' : 'recipients'}
              </p>
              <Button
                onClick={handleSend}
                disabled={isSending || !canSend}
                className="gap-1.5"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminEmails;
