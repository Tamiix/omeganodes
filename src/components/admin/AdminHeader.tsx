import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Shield, Users, UserCheck, Tag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isCustomersPage = location.pathname === '/admin/customers';
  const isDiscountCodesPage = location.pathname === '/admin/discount-codes';
  const isAccessCodesPage = location.pathname === '/admin/access-codes';

  return (
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
                Manage users, customers, and codes
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2">
            <Button
              variant={!isCustomersPage && !isDiscountCodesPage && !isAccessCodesPage ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/admin')}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Userbase
            </Button>
            <Button
              variant={isCustomersPage ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/admin/customers')}
              className="gap-2"
            >
              <UserCheck className="w-4 h-4" />
              Customers
            </Button>
            <Button
              variant={isDiscountCodesPage ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/admin/discount-codes')}
              className="gap-2"
            >
              <Tag className="w-4 h-4" />
              Discounts
            </Button>
            <Button
              variant={isAccessCodesPage ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/admin/access-codes')}
              className="gap-2"
            >
              <Clock className="w-4 h-4" />
              Trials
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
