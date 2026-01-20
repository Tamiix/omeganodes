import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  ShieldX, 
  Loader2,
  Package
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import UserOrderCard from './UserOrderCard';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  granted_at: string;
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

interface UserCardProps {
  userItem: UserProfile;
  currentUserId: string;
  onGrantAdmin: (userId: string) => Promise<void>;
  onRevokeAdmin: (userId: string) => Promise<void>;
  updatingUser: string | null;
  index: number;
}

const UserCard = ({ 
  userItem, 
  currentUserId, 
  onGrantAdmin, 
  onRevokeAdmin, 
  updatingUser,
  index 
}: UserCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const isCurrentUser = userItem.user_id === currentUserId;
  const hasAdminRole = userItem.roles.some(r => r.role === 'admin');

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/20 text-primary border-primary/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  useEffect(() => {
    if (isExpanded && orders.length === 0) {
      fetchOrders();
    }
  }, [isExpanded]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userItem.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="bg-card border-border hover:border-primary/30 transition-colors">
        <CardContent className="py-4">
          {/* Main User Row */}
          <div 
            className="flex items-center justify-between flex-wrap gap-4 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-omega flex items-center justify-center">
                <span className="text-primary-foreground font-medium">
                  {userItem.username[0].toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{userItem.username}</p>
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground">(you)</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{userItem.email}</p>
              </div>
            </div>

            {/* Roles */}
            <div className="flex items-center gap-2">
              {userItem.roles.filter(r => r.role === 'admin' || r.role === 'user').map(role => (
                <span
                  key={role.id}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(role.role)}`}
                >
                  {role.role}
                </span>
              ))}
            </div>

            {/* Actions & Expand */}
            <div className="flex items-center gap-2">
              {!isCurrentUser && (
                <>
                  {hasAdminRole ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRevokeAdmin(userItem.user_id);
                      }}
                      disabled={updatingUser === userItem.user_id}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      {updatingUser === userItem.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ShieldX className="w-4 h-4 mr-1" />
                          Revoke Admin
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGrantAdmin(userItem.user_id);
                      }}
                      disabled={updatingUser === userItem.user_id}
                      className="text-primary border-primary/30 hover:bg-primary/10"
                    >
                      {updatingUser === userItem.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 mr-1" />
                          Grant Admin
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    User Orders & Endpoints
                  </h4>

                  {loadingOrders ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No orders found for this user
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {orders.map(order => (
                        <UserOrderCard 
                          key={order.id} 
                          order={order} 
                          userId={userItem.user_id}
                          username={userItem.username}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UserCard;
