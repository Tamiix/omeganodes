import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Globe, 
  Radio, 
  Server, 
  Save, 
  Loader2,
  Package,
  Check,
  Copy,
  User
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
}

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  email: string;
  created_at: string;
  roles: UserRole[];
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
  created_at: string;
  expires_at: string | null;
  commitment: string;
}

interface ConnectionUrl {
  id: string;
  endpoint_type: string;
  url: string;
  api_key: string;
  is_active: boolean;
}

interface UserOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

const UserOverviewModal = ({ isOpen, onClose, user }: UserOverviewModalProps) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
      fetchOrders();
    }
  }, [isOpen, user.user_id]);

  useEffect(() => {
    if (selectedOrder) {
      fetchEndpoints(selectedOrder.id);
    }
  }, [selectedOrder]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      if (data && data.length > 0) {
        setSelectedOrder(data[0]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchEndpoints = async (orderId: string) => {
    const { data, error } = await supabase
      .from('connection_urls')
      .select('*')
      .eq('order_id', orderId);

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
    if (!selectedOrder) return;
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
            order_id: selectedOrder.id,
            user_id: user.user_id,
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

      fetchEndpoints(selectedOrder.id);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'expired':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const renderEndpointTab = (type: 'https' | 'ws' | 'grpc', label: string) => (
    <TabsContent value={type} className="mt-4 space-y-4">
      <div>
        <Label className="text-muted-foreground text-sm mb-2 block">{label} URL</Label>
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
        className="w-full"
        variant="omega"
      >
        {saving === type ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Save {label}
      </Button>
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
          className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-omega flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">
                    {user.username[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{user.username}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {user.roles.map(role => (
                  <Badge 
                    key={role.id}
                    className={role.role === 'admin' 
                      ? 'bg-primary/20 text-primary border-primary/30' 
                      : 'bg-muted text-muted-foreground border-border'
                    }
                  >
                    {role.role}
                  </Badge>
                ))}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-100px)] overflow-hidden">
            {/* Orders Sidebar */}
            <div className="w-80 border-r border-border bg-muted/20 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Orders ({orders.length})
                </h3>

                {loadingOrders ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No orders found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orders.map(order => (
                      <button
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedOrder?.id === order.id
                            ? 'bg-primary/10 border border-primary/30'
                            : 'bg-card border border-border hover:border-primary/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground text-sm">{order.plan_name}</span>
                          <Badge className={`text-xs ${getStatusBadge(order.status)}`}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">#{order.order_number}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.server_type} · {order.location}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Endpoint Manager */}
            <div className="flex-1 p-6 overflow-y-auto">
              {selectedOrder ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {selectedOrder.plan_name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>#{selectedOrder.order_number}</span>
                      <span>·</span>
                      <span>{selectedOrder.server_type}</span>
                      <span>·</span>
                      <span>{selectedOrder.location}</span>
                      <span>·</span>
                      <span>${selectedOrder.amount_usd.toFixed(2)}/mo</span>
                    </div>
                    {selectedOrder.expires_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Expires: {format(new Date(selectedOrder.expires_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>

                  <div className="bg-muted/30 rounded-xl p-5 border border-border">
                    <h4 className="font-medium text-foreground mb-4">Endpoints</h4>
                    
                    <Tabs defaultValue="https" className="w-full">
                      <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 rounded-lg">
                        <TabsTrigger 
                          value="https" 
                          className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                        >
                          <Globe className="w-4 h-4" />
                          HTTPS
                        </TabsTrigger>
                        <TabsTrigger 
                          value="ws" 
                          className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                        >
                          <Radio className="w-4 h-4" />
                          WS
                        </TabsTrigger>
                        <TabsTrigger 
                          value="grpc" 
                          className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                        >
                          <Server className="w-4 h-4" />
                          gRPC
                        </TabsTrigger>
                      </TabsList>
                      
                      {renderEndpointTab('https', 'HTTPS')}
                      {renderEndpointTab('ws', 'WebSocket')}
                      {renderEndpointTab('grpc', 'gRPC')}
                    </Tabs>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Package className="w-12 h-12 mb-4 opacity-50" />
                  <p>Select an order to manage endpoints</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UserOverviewModal;
