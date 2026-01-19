import { Users, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AdminStatsProps {
  totalUsers: number;
  adminCount: number;
}

const AdminStats = ({ totalUsers, adminCount }: AdminStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-3xl font-bold text-foreground">{totalUsers}</p>
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
              <p className="text-3xl font-bold text-foreground">{adminCount}</p>
            </div>
            <ShieldCheck className="w-10 h-10 text-primary/50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStats;
