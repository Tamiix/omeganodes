import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  ShieldX, 
  Loader2,
  Eye
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UserOverviewModal from './UserOverviewModal';

interface UserRole {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'user';
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
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

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

  return (
    <>
      <motion.div
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
                {userItem.roles.filter(r => r.role === 'admin' || r.role === 'user').map(role => (
                  <span
                    key={role.id}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(role.role)}`}
                  >
                    {role.role}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="omega"
                  size="sm"
                  onClick={() => setIsOverviewOpen(true)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Overview
                </Button>

                {!isCurrentUser && (
                  <>
                    {hasAdminRole ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRevokeAdmin(userItem.user_id)}
                        disabled={updatingUser === userItem.user_id}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        {updatingUser === userItem.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ShieldX className="w-4 h-4 mr-1" />
                            Revoke
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onGrantAdmin(userItem.user_id)}
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
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* User Overview Modal */}
      <UserOverviewModal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        user={userItem}
      />
    </>
  );
};

export default UserCard;
