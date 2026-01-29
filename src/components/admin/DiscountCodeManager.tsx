import { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Percent, DollarSign, Calendar, Hash, Power, Edit2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DiscountCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
  applicable_to: 'shared' | 'dedicated' | 'both';
}

const DiscountCodeManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  
  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formMaxUses, setFormMaxUses] = useState('');
  const [formApplicableTo, setFormApplicableTo] = useState<'shared' | 'dedicated' | 'both'>('both');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes((data || []) as DiscountCode[]);
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch discount codes',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormCode('');
    setFormDiscountType('percentage');
    setFormDiscountValue('');
    setFormExpiresAt('');
    setFormMaxUses('');
    setFormApplicableTo('both');
    setEditingCode(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (code: DiscountCode) => {
    setEditingCode(code);
    setFormCode(code.code);
    setFormDiscountType(code.discount_type);
    setFormDiscountValue(code.discount_value.toString());
    setFormExpiresAt(code.expires_at ? new Date(code.expires_at).toISOString().split('T')[0] : '');
    setFormMaxUses(code.max_uses?.toString() || '');
    setFormApplicableTo(code.applicable_to || 'both');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formCode.trim() || !formDiscountValue) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    const discountValue = parseFloat(formDiscountValue);
    if (isNaN(discountValue) || discountValue <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Discount value must be a positive number',
        variant: 'destructive'
      });
      return;
    }

    if (formDiscountType === 'percentage' && discountValue > 100) {
      toast({
        title: 'Validation Error',
        description: 'Percentage discount cannot exceed 100%',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const codeData = {
        code: formCode.trim().toUpperCase(),
        discount_type: formDiscountType,
        discount_value: discountValue,
        expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
        max_uses: formMaxUses ? parseInt(formMaxUses) : null,
        applicable_to: formApplicableTo,
      };

      if (editingCode) {
        const { error } = await supabase
          .from('discount_codes')
          .update(codeData)
          .eq('id', editingCode.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Discount code updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('discount_codes')
          .insert({
            ...codeData,
            created_by: user?.id,
          });

        if (error) {
          if (error.message.includes('duplicate')) {
            toast({
              title: 'Error',
              description: 'A code with this name already exists',
              variant: 'destructive'
            });
            return;
          }
          throw error;
        }
        toast({
          title: 'Success',
          description: 'Discount code created successfully',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCodes();
    } catch (error) {
      console.error('Error saving discount code:', error);
      toast({
        title: 'Error',
        description: 'Failed to save discount code',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCodeStatus = async (code: DiscountCode) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id);

      if (error) throw error;
      
      toast({
        title: code.is_active ? 'Code Deactivated' : 'Code Activated',
        description: `${code.code} has been ${code.is_active ? 'deactivated' : 'activated'}`,
      });
      fetchCodes();
    } catch (error) {
      console.error('Error toggling code status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update code status',
        variant: 'destructive'
      });
    }
  };

  const deleteCode = async (code: DiscountCode) => {
    if (!confirm(`Are you sure you want to delete the code "${code.code}"?`)) return;

    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', code.id);

      if (error) throw error;
      
      toast({
        title: 'Deleted',
        description: `Discount code ${code.code} has been deleted`,
      });
      fetchCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete discount code',
        variant: 'destructive'
      });
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isMaxedOut = (code: DiscountCode) => {
    if (!code.max_uses) return false;
    return code.current_uses >= code.max_uses;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Discount Codes
          </h2>
          <p className="text-sm text-muted-foreground">
            Create and manage promotional discount codes
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Code
        </Button>
      </div>

      {/* Codes List */}
      {codes.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No discount codes yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first discount code to offer promotions
            </p>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {codes.map((code) => {
            const expired = isExpired(code.expires_at);
            const maxedOut = isMaxedOut(code);
            const inactive = !code.is_active || expired || maxedOut;

            return (
              <Card key={code.id} className={`bg-card border-border ${inactive ? 'opacity-60' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Code Badge */}
                      <div className={`px-4 py-2 rounded-lg font-mono font-bold text-lg ${
                        inactive 
                          ? 'bg-muted text-muted-foreground' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {code.code}
                      </div>

                      {/* Discount Info */}
                      <div className="flex items-center gap-2">
                        {code.discount_type === 'percentage' ? (
                          <div className="flex items-center gap-1 text-secondary">
                            <Percent className="w-4 h-4" />
                            <span className="font-bold">{code.discount_value}% OFF</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-secondary">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-bold">${code.discount_value} OFF</span>
                          </div>
                        )}
                      </div>

                      {/* Plan Badge */}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        code.applicable_to === 'shared' 
                          ? 'bg-blue-500/10 text-blue-500' 
                          : code.applicable_to === 'dedicated' 
                            ? 'bg-purple-500/10 text-purple-500'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {code.applicable_to === 'shared' ? 'Shared Only' : code.applicable_to === 'dedicated' ? 'Dedicated Only' : 'All Plans'}
                      </span>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {!code.is_active && (
                          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                            Inactive
                          </span>
                        )}
                        {expired && (
                          <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs">
                            Expired
                          </span>
                        )}
                        {maxedOut && (
                          <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs">
                            Max Uses Reached
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta & Actions */}
                    <div className="flex items-center gap-4">
                      {/* Usage Stats */}
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          <span>{code.current_uses}{code.max_uses ? `/${code.max_uses}` : ''} uses</span>
                        </div>
                        {code.expires_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Expires {new Date(code.expires_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleCodeStatus(code)}
                          className={code.is_active ? 'text-secondary hover:text-secondary' : 'text-muted-foreground'}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(code)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCode(code)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editingCode ? 'Edit Discount Code' : 'Create Discount Code'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Code Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Code *
              </label>
              <Input
                placeholder="e.g. SUMMER20"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                className="bg-muted/30 border-border font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Code will be automatically uppercased
              </p>
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Discount Type *
              </label>
              <Select value={formDiscountType} onValueChange={(v) => setFormDiscountType(v as 'percentage' | 'flat')}>
                <SelectTrigger className="bg-muted/30 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      Percentage Discount
                    </div>
                  </SelectItem>
                  <SelectItem value="flat">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Flat USD Discount
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Discount Value *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {formDiscountType === 'percentage' ? '%' : '$'}
                </span>
                <Input
                  type="number"
                  placeholder={formDiscountType === 'percentage' ? '20' : '50'}
                  value={formDiscountValue}
                  onChange={(e) => setFormDiscountValue(e.target.value)}
                  className="bg-muted/30 border-border pl-8"
                  min="0"
                  max={formDiscountType === 'percentage' ? '100' : undefined}
                />
              </div>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Expiry Date (Optional)
              </label>
              <Input
                type="date"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
                className="bg-muted/30 border-border"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for no expiration
              </p>
            </div>

            {/* Max Uses */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Maximum Uses (Optional)
              </label>
              <Input
                type="number"
                placeholder="Unlimited"
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
                className="bg-muted/30 border-border"
                min="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for unlimited uses
              </p>
            </div>

            {/* Applicable To */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Applicable To *
              </label>
              <Select value={formApplicableTo} onValueChange={(v) => setFormApplicableTo(v as 'shared' | 'dedicated' | 'both')}>
                <SelectTrigger className="bg-muted/30 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">
                    All Plans (Shared & Dedicated)
                  </SelectItem>
                  <SelectItem value="shared">
                    Shared Only
                  </SelectItem>
                  <SelectItem value="dedicated">
                    Dedicated Only
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Which server types can use this code
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : editingCode ? (
                'Save Changes'
              ) : (
                'Create Code'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiscountCodeManager;
