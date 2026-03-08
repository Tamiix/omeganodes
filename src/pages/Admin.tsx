import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, AlertTriangle, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminStats from '@/components/admin/AdminStats';
import UserCard from '@/components/admin/UserCard';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  email: string;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'user';
  granted_at: string;
}

interface UserWithRoles extends UserProfile {
  roles: UserRole[];
  hasActiveSub: boolean;
}

type SubFilter = 'all' | 'active' | 'inactive';

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [subFilter, setSubFilter] = useState<SubFilter>('all');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isAdmin) {
        navigate('/dashboard');
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access the admin panel.',
          variant: 'destructive'
        });
      }
    }
  }, [user, isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const [profilesRes, rolesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        supabase.from('orders').select('*').in('status', ['completed', 'active']),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const now = new Date();

      const usersWithRoles: UserWithRoles[] = (profilesRes.data || []).map(profile => {
        const userOrders = (ordersRes.data || []).filter(o => o.user_id === profile.user_id);
        // Active sub = has a non-trial, non-test order that hasn't expired
        const hasActiveSub = userOrders.some(o => {
          if (o.is_test_order) return false;
          if (o.commitment === 'trial' || o.payment_method === 'trial_code' || o.commitment === 'daily') return false;
          if (o.expires_at && new Date(o.expires_at) < now) return false;
          return true;
        });

        return {
          ...profile,
          roles: (rolesRes.data || []).filter(r => r.user_id === profile.user_id),
          hasActiveSub,
        };
      });

      setUsers(usersWithRoles as UserWithRoles[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const grantAdmin = async (userId: string) => {
    if (!user) return;
    
    setUpdatingUser(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
          granted_by: user.id
        });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast({
            title: 'Already Admin',
            description: 'User already has admin role',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Admin Granted',
          description: 'Successfully granted admin role',
        });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error granting admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to grant admin role',
        variant: 'destructive'
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const revokeAdmin = async (userId: string) => {
    setUpdatingUser(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast({
        title: 'Admin Revoked',
        description: 'Successfully revoked admin role',
      });
      fetchUsers();
    } catch (error) {
      console.error('Error revoking admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke admin role',
        variant: 'destructive'
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const filteredUsers = users
    .filter(u => 
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(u => {
      if (subFilter === 'active') return u.hasActiveSub;
      if (subFilter === 'inactive') return !u.hasActiveSub;
      return true;
    });

  const adminCount = users.filter(u => u.roles.some(r => r.role === 'admin')).length;
  const activeSubCount = users.filter(u => u.hasActiveSub).length;

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

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AdminStats totalUsers={users.length} adminCount={adminCount} />

        {/* Search + Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Button
              variant={subFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSubFilter('all')}
              className="h-7 text-xs"
            >
              All ({users.length})
            </Button>
            <Button
              variant={subFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSubFilter('active')}
              className="h-7 text-xs"
            >
              Active Sub ({activeSubCount})
            </Button>
            <Button
              variant={subFilter === 'inactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSubFilter('inactive')}
              className="h-7 text-xs"
            >
              No Active Sub ({users.length - activeSubCount})
            </Button>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search query' : 'Users will appear here'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((userItem, index) => (
              <UserCard
                key={userItem.id}
                userItem={userItem}
                currentUserId={user?.id || ''}
                onGrantAdmin={grantAdmin}
                onRevokeAdmin={revokeAdmin}
                updatingUser={updatingUser}
                index={index}
                onUserDeleted={fetchUsers}
              />
            ))
          )}
        </div>

        {/* Warning */}
        <div className="mt-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-400">Security Notice</p>
              <p className="text-sm text-yellow-400/80 mt-1">
                Admin roles have full access to all user data, orders, and system settings. 
                Only grant admin permissions to trusted staff members.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
