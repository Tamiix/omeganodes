import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Package, 
  Link2, 
  Receipt, 
  Copy, 
  Check,
  ExternalLink,
  Clock,
  Server,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Order {
  id: string;
  order_number: string;
  plan_name: string;
  commitment: string;
  server_type: string;
  location: string;
  rps: number;
  tps: number;
  amount_usd: number;
  currency_code: string;
  currency_amount: number;
  payment_method: string;
  transaction_signature: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
}

interface ConnectionUrl {
  id: string;
  order_id: string;
  endpoint_type: string;
  url: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [connections, setConnections] = useState<ConnectionUrl[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'connections'>('orders');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    // Fetch orders
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (ordersData) {
      setOrders(ordersData as Order[]);
    }

    // Fetch connection URLs
    const { data: connectionsData } = await supabase
      .from('connection_urls')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (connectionsData) {
      setConnections(connectionsData as ConnectionUrl[]);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'expired':
        return 'bg-muted text-muted-foreground border-border';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {profile?.username}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'orders'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-4 h-4" />
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'connections'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Connections ({connections.length})
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No orders yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by purchasing a plan from our pricing section.
                  </p>
                  <Button variant="omega" onClick={() => navigate('/#pricing')}>
                    View Plans
                  </Button>
                </CardContent>
              </Card>
            ) : (
              orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-card border-border hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {order.order_number}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">
                            {order.currency_code} {order.currency_amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ~${order.amount_usd.toFixed(2)} USD
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-muted-foreground">Server</p>
                            <p className="font-medium text-foreground capitalize">{order.server_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p className="font-medium text-foreground">{order.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-muted-foreground">Commitment</p>
                            <p className="font-medium text-foreground capitalize">{order.commitment}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Performance</p>
                          <p className="font-medium text-foreground">{order.rps} RPS / {order.tps} TPS</p>
                        </div>
                      </div>

                      {order.transaction_signature && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">Transaction</p>
                          <a
                            href={`https://solscan.io/tx/${order.transaction_signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            {order.transaction_signature.slice(0, 20)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-4">
            {connections.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No connections yet</h3>
                  <p className="text-muted-foreground">
                    Your connection URLs will appear here after your order is activated.
                  </p>
                </CardContent>
              </Card>
            ) : (
              connections.map((connection, index) => (
                <motion.div
                  key={connection.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {connection.endpoint_type}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            connection.is_active
                              ? 'bg-secondary/20 text-secondary'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {connection.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Endpoint URL */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Endpoint URL</p>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                          <code className="flex-1 text-sm text-foreground font-mono truncate">
                            {connection.url}
                          </code>
                          <button
                            onClick={() => copyToClipboard(connection.url, `url-${connection.id}`)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            {copiedId === `url-${connection.id}` ? (
                              <Check className="w-4 h-4 text-secondary" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* API Key */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">API Key</p>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                          <code className="flex-1 text-sm text-foreground font-mono truncate">
                            {connection.api_key}
                          </code>
                          <button
                            onClick={() => copyToClipboard(connection.api_key, `key-${connection.id}`)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            {copiedId === `key-${connection.id}` ? (
                              <Check className="w-4 h-4 text-secondary" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
