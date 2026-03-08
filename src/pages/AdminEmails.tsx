import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Users, UserCheck, Mail, Loader2, User, Tag, Percent, Sparkles, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/admin/AdminHeader';

type Audience = 'single' | 'all' | 'active' | 'inactive';
type TemplateType = 'discount' | 'announcement' | 'custom' | null;

const LOGO_URL = 'https://mmkornqvbafkricqixgk.supabase.co/storage/v1/object/public/email-assets/omega-logo-new.png';

const h1Style = `font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px;`;
const pStyle = `font-size:14px;color:#a0a3b1;line-height:1.6;margin:0 0 24px;`;
const btnStyle = `display:inline-block;background:#5B4EE4;color:#fff;font-size:14px;font-weight:600;border-radius:8px;padding:12px 24px;text-decoration:none;`;
const codeBlockStyle = `background:#1e1e30;border:1px solid #2a2a40;border-radius:8px;padding:16px;text-align:center;`;
const codeLabelStyle = `font-size:11px;color:#a0a3b1;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;`;
const codeValueStyle = `font-size:24px;font-weight:700;color:#7C6FF7;margin:0;letter-spacing:3px;font-family:'JetBrains Mono',monospace;`;
const planLabelStyle = `font-size:13px;font-weight:600;color:#ffffff;margin:0 0 2px;`;

const wrapHtml = (content: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Inter',system-ui,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 28px;">
<img src="${LOGO_URL}" width="40" height="40" alt="OmegaNodes" style="display:block;margin-bottom:28px;" />
${content}
<p style="font-size:12px;color:#555;margin-top:40px;border-top:1px solid #2a2a40;padding-top:20px;">
OmegaNodes &mdash; Solana Node Infrastructure<br/>
<a href="https://omeganodes.io" style="color:#7C6FF7;text-decoration:none;">omeganodes.io</a></p>
</div></body></html>`;

interface DiscountState {
  sharedCode: string;
  sharedDiscount: string;
  dedicatedCode: string;
  dedicatedDiscount: string;
}

interface ContentFields {
  headline: string;
  message: string;
  buttonText: string;
  buttonUrl: string;
}

const buildDiscountHtml = (d: DiscountState, fields: ContentFields) => {
  const sharedBlock = d.sharedCode ? `<div style="${codeBlockStyle}margin-bottom:12px;">
    <p style="${planLabelStyle}">Shared Servers${d.sharedDiscount ? ` — ${d.sharedDiscount}` : ''}</p>
    <p style="${codeLabelStyle}">Discount code</p>
    <p style="${codeValueStyle}">${d.sharedCode.toUpperCase()}</p></div>` : '';
  const dedicatedBlock = d.dedicatedCode ? `<div style="${codeBlockStyle}">
    <p style="${planLabelStyle}">Dedicated Servers${d.dedicatedDiscount ? ` — ${d.dedicatedDiscount}` : ''}</p>
    <p style="${codeLabelStyle}">Discount code</p>
    <p style="${codeValueStyle}">${d.dedicatedCode.toUpperCase()}</p></div>` : '';

  return wrapHtml(`<h1 style="${h1Style}">${fields.headline}</h1>
<p style="${pStyle}">${fields.message}</p>
<div style="margin-bottom:24px;">${sharedBlock}${dedicatedBlock}</div>
<a href="${fields.buttonUrl}" style="${btnStyle}">${fields.buttonText}</a>`);
};

const buildGenericHtml = (fields: ContentFields) => {
  return wrapHtml(`<h1 style="${h1Style}">${fields.headline}</h1>
<p style="${pStyle}">${fields.message.replace(/\n/g, '<br/>')}</p>
<a href="${fields.buttonUrl}" style="${btnStyle}">${fields.buttonText}</a>`);
};

const templateDefaults: Record<string, { subject: string; fields: ContentFields; discount?: DiscountState }> = {
  discount: {
    subject: '💰 Exclusive Discount on OmegaNodes',
    fields: {
      headline: 'Exclusive deal, just for you',
      message: "We're running a limited-time discount on our Solana node plans. Use the codes below at checkout to save.",
      buttonText: 'View Plans',
      buttonUrl: 'https://omeganodes.io/#pricing',
    },
    discount: { sharedCode: '', sharedDiscount: '', dedicatedCode: '', dedicatedDiscount: '' },
  },
  announcement: {
    subject: '🚀 Big News from OmegaNodes',
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
    sharedCode: '', sharedDiscount: '', dedicatedCode: '', dedicatedDiscount: '',
  });

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

      toast({ title: 'Emails sent!', description: `${data.sent} sent, ${data.failed} failed out of ${data.total} recipients.` });
      if (data.failed > 0) console.warn('Failed emails:', data.results.filter((r: any) => !r.success));
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
        {/* Template Picker */}
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
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Leave a field empty to exclude that server type.</p>
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
                    <div className="border border-border rounded-lg overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
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
