import { format } from 'date-fns';
import { Calendar, MapPin, Cpu, Zap, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EndpointTabs from './EndpointTabs';

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

interface UserOrderCardProps {
  order: Order;
  userId: string;
}

const UserOrderCard = ({ order, userId }: UserOrderCardProps) => {
  const getStatusColor = (status: string) => {
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

  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-foreground">{order.plan_name}</p>
          <p className="text-xs text-muted-foreground">#{order.order_number}</p>
        </div>
        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Cpu className="w-3 h-3" />
          <span>{order.server_type}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>{order.location}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="w-3 h-3" />
          <span>{order.rps} RPS / {order.tps} TPS</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="w-3 h-3" />
          <span>${order.amount_usd.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground col-span-2">
          <Calendar className="w-3 h-3" />
          <span>
            {format(new Date(order.created_at), 'MMM d, yyyy')}
            {order.expires_at && ` → ${format(new Date(order.expires_at), 'MMM d, yyyy')}`}
          </span>
        </div>
      </div>

      <EndpointTabs orderId={order.id} userId={userId} />
    </div>
  );
};

export default UserOrderCard;
