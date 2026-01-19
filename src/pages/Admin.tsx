import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  Shield, 
  ShieldCheck, 
  ShieldX,
  Search,
  Loader2,
  UserCog,
  Package,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  role: 'admin' | 'moderator' | 'user';
  granted_at: string;
}

interface UserWithRoles extends UserProfile {
  roles: UserRole[];
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

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
      // Fetch all profiles (admin can see all)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        ...profile,
        roles: (roles || []).filter(r => r.user_id === profile.user_id)
      }));

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

  const grantRole = async (userId: string, role: 'admin' | 'moderator') => {
    if (!user) return;
    
    setUpdatingUser(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          granted_by: user.id
        });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast({
            title: 'Already Assigned',
            description: `User already has the ${role} role`,
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Role Granted',
          description: `Successfully granted ${role} role`,
        });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error granting role:', error);
      toast({
        title: 'Error',
        description: 'Failed to grant role',
        variant: 'destructive'
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const revokeRole = async (userId: string, role: 'admin' | 'moderator') => {
    setUpdatingUser(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast({
        title: 'Role Revoked',
        description: `Successfully revoked ${role} role`,
      });
      fetchUsers();
    } catch (error) {
      console.error('Error revoking role:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke role',
        variant: 'destructive'
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'moderator':
        return 'bg-accent/20 text-accent border-accent/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

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
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Admin Panel
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage users and permissions
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold text-foreground">{users.length}</p>
                </div>
                <Users className="w-10 h-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                  <p className="text-3xl font-bold text-foreground">
                    {users.filter(u => u.roles.some(r => r.role === 'admin')).length}
                  </p>
                </div>
                <ShieldCheck className="w-10 h-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Moderators</p>
                  <p className="text-3xl font-bold text-foreground">
                    {users.filter(u => u.roles.some(r => r.role === 'moderator')).length}
                  </p>
                </div>
                <UserCog className="w-10 h-10 text-accent/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
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
            filteredUsers.map((userItem, index) => {
              const isCurrentUser = userItem.user_id === user?.id;
              const hasAdminRole = userItem.roles.some(r => r.role === 'admin');
              const hasModeratorRole = userItem.roles.some(r => r.role === 'moderator');

              return (
                <motion.div
                  key={userItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-card border-border hover:border-primary/30 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
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
                          {userItem.roles.map(role => (
                            <span
                              key={role.id}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(role.role)}`}
                            >
                              {role.role}
                            </span>
                          ))}
                        </div>

                        {/* Actions */}
                        {!isCurrentUser && (
                          <div className="flex items-center gap-2">
                            {hasAdminRole ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => revokeRole(userItem.user_id, 'admin')}
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
                                onClick={() => grantRole(userItem.user_id, 'admin')}
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

                            {hasModeratorRole && !hasAdminRole ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => revokeRole(userItem.user_id, 'moderator')}
                                disabled={updatingUser === userItem.user_id}
                                className="text-muted-foreground hover:bg-muted"
                              >
                                {updatingUser === userItem.user_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Revoke Mod'
                                )}
                              </Button>
                            ) : !hasAdminRole && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => grantRole(userItem.user_id, 'moderator')}
                                disabled={updatingUser === userItem.user_id}
                                className="text-accent border-accent/30 hover:bg-accent/10"
                              >
                                {updatingUser === userItem.user_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Grant Mod'
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
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
