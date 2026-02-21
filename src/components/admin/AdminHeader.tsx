import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Shield, Users, UserCheck, Tag, Clock, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isCustomersPage = location.pathname === '/admin/customers';
  const isDiscountCodesPage = location.pathname === '/admin/discount-codes';
  const isAccessCodesPage = location.pathname === '/admin/access-codes';
  const isReferralsPage = location.pathname === '/admin/referrals';

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Admin Panel
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Manage users, customers, and codes
              </p>
            </div>
          </div>

          {/* Navigation Tabs - horizontally scrollable on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            <Button
              variant={!isCustomersPage && !isDiscountCodesPage && !isAccessCodesPage && !isReferralsPage ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/admin')}
              className="gap-1.5 shrink-0 text-xs sm:text-sm h-8"
            >
              <Users className="w-3.5 h-3.5" />
              Userbase
            </Button>
            <Button
              variant={isCustomersPage ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/admin/customers')}
              className="gap-1.5 shrink-0 text-xs sm:text-sm h-8"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Customers
            </Button>
            <Button
              variant={isDiscountCodesPage ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/admin/discount-codes')}
              className="gap-1.5 shrink-0 text-xs sm:text-sm h-8"
            >
              <Tag className="w-3.5 h-3.5" />
              Discounts
            </Button>
            <Button
              variant={isAccessCodesPage ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/admin/access-codes')}
              className="gap-1.5 shrink-0 text-xs sm:text-sm h-8"
            >
              <Clock className="w-3.5 h-3.5" />
              Trials
            </Button>
            <Button
              variant={isReferralsPage ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/admin/referrals')}
              className="gap-1.5 shrink-0 text-xs sm:text-sm h-8"
            >
              <Gift className="w-3.5 h-3.5" />
              Referrals
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
