import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/admin/AdminHeader';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CustomerOrder {
  id: string;
  user_id: string;
  order_number: string;
  plan_name: string;
  amount_usd: number;
  status: string;
  created_at: string;
  expires_at: string | null;
  commitment: string;
  server_type: string;
  location: string;
}

interface CustomerProfile {
  user_id: string;
  username: string;
  email: string;
}

interface CustomerData {
  profile: CustomerProfile;
  orders: CustomerOrder[];
  activeOrdersCount: number;
  totalSpent: number;
}

const Customers = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isAdmin) {
        navigate('/dashboard');
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access this page.',
          variant: 'destructive'
        });
      }
    }
  }, [user, isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchCustomers();
    }
  }, [user, isAdmin]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // Fetch all orders with status 'completed' or 'active'
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['completed', 'active', 'pending'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Group orders by user
      const customerMap = new Map<string, CustomerData>();

      (orders || []).forEach(order => {
        const profile = (profiles || []).find(p => p.user_id === order.user_id);
        if (!profile) return;

        if (!customerMap.has(order.user_id)) {
          customerMap.set(order.user_id, {
            profile: {
              user_id: profile.user_id,
              username: profile.username,
              email: profile.email
            },
            orders: [],
            activeOrdersCount: 0,
            totalSpent: 0
          });
        }

        const customer = customerMap.get(order.user_id)!;
        customer.orders.push(order);
        
        if (order.status === 'completed' || order.status === 'active') {
          customer.activeOrdersCount++;
          customer.totalSpent += Number(order.amount_usd);
        }
      });

      // Filter to only customers with at least one order
      const customersArray = Array.from(customerMap.values())
        .filter(c => c.orders.length > 0)
        .sort((a, b) => b.totalSpent - a.totalSpent);

      setCustomers(customersArray);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch customers',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.profile.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.profile.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'active':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        );
    }
  };

  const totalActiveCustomers = customers.filter(c => c.activeOrdersCount > 0).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{totalActiveCustomers}</p>
                <p className="text-sm text-muted-foreground">Active Customers</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary">{formatPrice(totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{customers.reduce((sum, c) => sum + c.orders.length, 0)}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search customers by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Customers List */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No customers found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search query' : 'Customers with active subscriptions will appear here'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredCustomers.map((customer) => (
              <Card key={customer.profile.user_id} className="bg-card border-border overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{customer.profile.username}</h3>
                      <p className="text-sm text-muted-foreground">{customer.profile.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-secondary">{formatPrice(customer.totalSpent)}</p>
                      <p className="text-xs text-muted-foreground">Total spent</p>
                    </div>
                  </div>

                  {/* Orders */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {customer.orders.length} Order{customer.orders.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-2">
                      {customer.orders.slice(0, 3).map((order) => (
                        <div 
                          key={order.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusBadge(order.status)}
                            <div>
                              <p className="text-sm font-medium text-foreground">{order.plan_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {order.order_number} • {order.server_type} • {order.location}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">{formatPrice(Number(order.amount_usd))}/mo</p>
                            <p className="text-xs text-muted-foreground">{order.commitment}</p>
                          </div>
                        </div>
                      ))}
                      {customer.orders.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          +{customer.orders.length - 3} more order{customer.orders.length - 3 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Customers;
