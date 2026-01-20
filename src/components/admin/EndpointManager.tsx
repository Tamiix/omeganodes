import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Radio, 
  Server, 
  Save, 
  Loader2, 
  X, 
  Link2,
  Check,
  Copy
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConnectionUrl {
  id: string;
  endpoint_type: string;
  url: string;
  api_key: string;
  is_active: boolean;
}

interface Order {
  id: string;
  order_number: string;
  plan_name: string;
  server_type: string;
  location: string;
  rps: number;
  tps: number;
  amount_usd: number;
  status: string;
  commitment: string;
}

interface EndpointManagerProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  userId: string;
  username: string;
}

const EndpointManager = ({ isOpen, onClose, order, userId, username }: EndpointManagerProps) => {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<Record<string, ConnectionUrl | null>>({
    https: null,
    ws: null,
    grpc: null,
  });
  const [formData, setFormData] = useState({
    https: { url: '', api_key: '' },
    ws: { url: '', api_key: '' },
    grpc: { url: '', api_key: '' },
  });
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEndpoints();
    }
  }, [isOpen, order.id]);

  const fetchEndpoints = async () => {
    const { data, error } = await supabase
      .from('connection_urls')
      .select('*')
      .eq('order_id', order.id);

    if (error) {
      console.error('Error fetching endpoints:', error);
      return;
    }

    const endpointMap: Record<string, ConnectionUrl | null> = {
      https: null,
      ws: null,
      grpc: null,
    };

    const formDataMap = {
      https: { url: '', api_key: '' },
      ws: { url: '', api_key: '' },
      grpc: { url: '', api_key: '' },
    };

    data?.forEach((ep) => {
      const type = ep.endpoint_type.toLowerCase();
      if (type in endpointMap) {
        endpointMap[type] = ep;
        formDataMap[type as keyof typeof formDataMap] = {
          url: ep.url,
          api_key: ep.api_key,
        };
      }
    });

    setEndpoints(endpointMap);
    setFormData(formDataMap);
  };

  const handleSave = async (type: 'https' | 'ws' | 'grpc') => {
    setSaving(type);
    const existing = endpoints[type];
    const data = formData[type];

    try {
      if (existing) {
        const { error } = await supabase
          .from('connection_urls')
          .update({
            url: data.url,
            api_key: data.api_key,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('connection_urls')
          .insert({
            order_id: order.id,
            user_id: userId,
            endpoint_type: type.toUpperCase(),
            url: data.url,
            api_key: data.api_key,
            is_active: true,
          });

        if (error) throw error;
      }

      toast({
        title: 'Saved',
        description: `${type.toUpperCase()} endpoint saved successfully`,
      });

      fetchEndpoints();
    } catch (error) {
      console.error('Error saving endpoint:', error);
      toast({
        title: 'Error',
        description: 'Failed to save endpoint',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const updateFormData = (type: 'https' | 'ws' | 'grpc', field: 'url' | 'api_key', value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (type: 'https' | 'ws' | 'grpc') => {
    const endpoint = endpoints[type];
    if (endpoint && endpoint.url) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs bg-secondary/20 text-secondary">
          Configured
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
        Not Set
      </span>
    );
  };

  const renderTabContent = (type: 'https' | 'ws' | 'grpc', label: string) => (
    <TabsContent value={type} className="mt-6 space-y-5">
      <div className="space-y-4">
        <div>
          <Label className="text-muted-foreground text-sm mb-2 block">{label} Endpoint URL</Label>
          <div className="relative">
            <Input
              value={formData[type].url}
              onChange={(e) => updateFormData(type, 'url', e.target.value)}
              placeholder={`https://rpc.example.com/${type}`}
              className="bg-background border-border pr-10 font-mono text-sm"
            />
            {formData[type].url && (
              <button
                onClick={() => copyToClipboard(formData[type].url, `url-${type}`)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted transition-colors"
              >
                {copiedId === `url-${type}` ? (
                  <Check className="w-4 h-4 text-secondary" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        </div>
        
        <div>
          <Label className="text-muted-foreground text-sm mb-2 block">API Key</Label>
          <div className="relative">
            <Input
              value={formData[type].api_key}
              onChange={(e) => updateFormData(type, 'api_key', e.target.value)}
              placeholder="Enter API key..."
              className="bg-background border-border pr-10 font-mono text-sm"
            />
            {formData[type].api_key && (
              <button
                onClick={() => copyToClipboard(formData[type].api_key, `key-${type}`)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted transition-colors"
              >
                {copiedId === `key-${type}` ? (
                  <Check className="w-4 h-4 text-secondary" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        </div>

        <Button
          onClick={() => handleSave(type)}
          disabled={saving === type || (!formData[type].url && !formData[type].api_key)}
          className="w-full mt-2"
          variant="omega"
        >
          {saving === type ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save {label} Endpoint
        </Button>
      </div>
    </TabsContent>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-omega flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Manage Endpoints</h2>
                  <p className="text-sm text-muted-foreground">
                    {username} · #{order.order_number}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="mt-4 p-3 rounded-lg bg-background/50 border border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{order.plan_name}</span>
                <span className="text-foreground font-medium">${order.amount_usd.toFixed(2)}/mo</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">{order.server_type} · {order.location}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  order.status === 'active' 
                    ? 'bg-secondary/20 text-secondary' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <Tabs defaultValue="https" className="w-full">
              <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 rounded-lg">
                <TabsTrigger 
                  value="https" 
                  className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Globe className="w-4 h-4" />
                  <span>HTTPS</span>
                  <span className="hidden sm:inline">{getStatusBadge('https')}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="ws" 
                  className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Radio className="w-4 h-4" />
                  <span>WS</span>
                  <span className="hidden sm:inline">{getStatusBadge('ws')}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="grpc" 
                  className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Server className="w-4 h-4" />
                  <span>gRPC</span>
                  <span className="hidden sm:inline">{getStatusBadge('grpc')}</span>
                </TabsTrigger>
              </TabsList>
              
              {renderTabContent('https', 'HTTPS')}
              {renderTabContent('ws', 'WebSocket')}
              {renderTabContent('grpc', 'gRPC')}
            </Tabs>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EndpointManager;
