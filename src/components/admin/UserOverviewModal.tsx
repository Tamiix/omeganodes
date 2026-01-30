import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Globe, 
  Package,
  Check,
  Copy,
  Loader2,
  Trash2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UserRole {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'user';
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
  is_active: boolean;
}

// Location-based endpoint URLs (static configuration)
const locationEndpoints = {
  "🇩🇪 Frankfurt V2": {
    rpc: "http://frav2.omeganetworks.io:8899",
    ws: "ws://frav2.omeganetworks.io:8900",
    grpc: "http://frav2.omeganetworks.io:9898"
  },
  "🇳🇱 Amsterdam V2": {
    rpc: "http://amsv2.omeganetworks.io:8899",
    ws: "ws://amsv2.omeganetworks.io:8900",
    grpc: "http://amsv2.omeganetworks.io:9898"
  },
  "🇺🇸 New York": {
    rpc: "http://newyork.omeganetworks.io",
    ws: "ws://newyork.omeganetworks.io:8900",
    grpc: "http://newyork.omeganetworks.io:10000"
  }
};

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
  const [selectedLocation, setSelectedLocation] = useState<string>("🇩🇪 Frankfurt V2");
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, user.user_id]);

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

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }
    
    setDeletingOrderId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Order deleted',
        description: 'The order has been successfully deleted.',
      });

      // Refresh orders list
      setOrders(orders.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(orders.find(o => o.id !== orderId) || null);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete order',
        variant: 'destructive',
      });
    } finally {
      setDeletingOrderId(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: 'Copied',
      description: 'Copied to clipboard',
    });
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

  const renderLocationEndpoints = (location: string, endpoints: { rpc: string; ws: string; grpc: string }) => (
    <TabsContent value={location} className="mt-4 space-y-4">
      <div>
        <Label className="text-muted-foreground text-sm mb-2 block">RPC Link</Label>
        <div className="relative">
          <Input
            value={endpoints.rpc}
            readOnly
            className="bg-background border-border pr-10 font-mono text-sm"
          />
          <button
            onClick={() => copyToClipboard(endpoints.rpc, `rpc-${location}`)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted transition-colors"
          >
            {copiedId === `rpc-${location}` ? (
              <Check className="w-4 h-4 text-secondary" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
      
      <div>
        <Label className="text-muted-foreground text-sm mb-2 block">WS Link</Label>
        <div className="relative">
          <Input
            value={endpoints.ws}
            readOnly
            className="bg-background border-border pr-10 font-mono text-sm"
          />
          <button
            onClick={() => copyToClipboard(endpoints.ws, `ws-${location}`)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted transition-colors"
          >
            {copiedId === `ws-${location}` ? (
              <Check className="w-4 h-4 text-secondary" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      <div>
        <Label className="text-muted-foreground text-sm mb-2 block">gRPC Link</Label>
        <div className="relative">
          <Input
            value={endpoints.grpc}
            readOnly
            className="bg-background border-border pr-10 font-mono text-sm"
          />
          <button
            onClick={() => copyToClipboard(endpoints.grpc, `grpc-${location}`)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted transition-colors"
          >
            {copiedId === `grpc-${location}` ? (
              <Check className="w-4 h-4 text-secondary" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
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
                      <div
                        key={order.id}
                        className={`relative p-3 rounded-lg transition-all ${
                          selectedOrder?.id === order.id
                            ? 'bg-primary/10 border border-primary/30'
                            : 'bg-card border border-border hover:border-primary/20'
                        }`}
                      >
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="w-full text-left"
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id);
                          }}
                          disabled={deletingOrderId === order.id}
                          className="absolute top-2 right-2 p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete order"
                        >
                          {deletingOrderId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
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
                    <h4 className="font-medium text-foreground mb-4">🔗 Endpoints by Location</h4>
                    
                    <Tabs defaultValue="🇩🇪 Frankfurt V2" className="w-full">
                      <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 rounded-lg">
                        <TabsTrigger 
                          value="🇩🇪 Frankfurt V2" 
                          className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs"
                        >
                          🇩🇪 Frankfurt V2
                        </TabsTrigger>
                        <TabsTrigger 
                          value="🇳🇱 Amsterdam V2" 
                          className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs"
                        >
                          🇳🇱 Amsterdam V2
                        </TabsTrigger>
                        <TabsTrigger 
                          value="🇺🇸 New York" 
                          className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs"
                        >
                          🇺🇸 New York
                        </TabsTrigger>
                      </TabsList>
                      
                      {renderLocationEndpoints('🇩🇪 Frankfurt V2', locationEndpoints['🇩🇪 Frankfurt V2'])}
                      {renderLocationEndpoints('🇳🇱 Amsterdam V2', locationEndpoints['🇳🇱 Amsterdam V2'])}
                      {renderLocationEndpoints('🇺🇸 New York', locationEndpoints['🇺🇸 New York'])}
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
