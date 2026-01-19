import { useState, useEffect } from 'react';
import { Globe, Radio, Server, Save, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConnectionUrl {
  id: string;
  endpoint_type: string;
  url: string;
  api_key: string;
  is_active: boolean;
}

interface EndpointTabsProps {
  orderId: string;
  userId: string;
}

const EndpointTabs = ({ orderId, userId }: EndpointTabsProps) => {
  const { toast } = useToast();
  const [endpoints, setEndpoints] = useState<Record<string, ConnectionUrl | null>>({
    https: null,
    ws: null,
    grpc: null,
  });
  const [formData, setFormData] = useState({
    https: { url: '', api_key: '' },
    ws: { url: '', api_key: '' },
    grpc: { url: '', api_key: '' },
  });
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchEndpoints();
  }, [orderId]);

  const fetchEndpoints = async () => {
    const { data, error } = await supabase
      .from('connection_urls')
      .select('*')
      .eq('order_id', orderId);

    if (error) {
      console.error('Error fetching endpoints:', error);
      return;
    }

    const endpointMap: Record<string, ConnectionUrl | null> = {
      https: null,
      ws: null,
      grpc: null,
    };

    const formDataMap = {
      https: { url: '', api_key: '' },
      ws: { url: '', api_key: '' },
      grpc: { url: '', api_key: '' },
    };

    data?.forEach((ep) => {
      const type = ep.endpoint_type.toLowerCase();
      if (type in endpointMap) {
        endpointMap[type] = ep;
        formDataMap[type as keyof typeof formDataMap] = {
          url: ep.url,
          api_key: ep.api_key,
        };
      }
    });

    setEndpoints(endpointMap);
    setFormData(formDataMap);
  };

  const handleSave = async (type: 'https' | 'ws' | 'grpc') => {
    setSaving(type);
    const existing = endpoints[type];
    const data = formData[type];

    try {
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('connection_urls')
          .update({
            url: data.url,
            api_key: data.api_key,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('connection_urls')
          .insert({
            order_id: orderId,
            user_id: userId,
            endpoint_type: type.toUpperCase(),
            url: data.url,
            api_key: data.api_key,
            is_active: true,
          });

        if (error) throw error;
      }

      toast({
        title: 'Saved',
        description: `${type.toUpperCase()} endpoint saved successfully`,
      });

      fetchEndpoints();
    } catch (error) {
      console.error('Error saving endpoint:', error);
      toast({
        title: 'Error',
        description: 'Failed to save endpoint',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const updateFormData = (type: 'https' | 'ws' | 'grpc', field: 'url' | 'api_key', value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const renderTabContent = (type: 'https' | 'ws' | 'grpc', icon: React.ReactNode, label: string) => (
    <TabsContent value={type} className="mt-4 space-y-4">
      <div className="space-y-3">
        <div>
          <Label className="text-muted-foreground text-xs">{label} URL</Label>
          <Input
            value={formData[type].url}
            onChange={(e) => updateFormData(type, 'url', e.target.value)}
            placeholder={`Enter ${label} endpoint URL...`}
            className="bg-background border-border mt-1"
          />
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">API Key</Label>
          <Input
            value={formData[type].api_key}
            onChange={(e) => updateFormData(type, 'api_key', e.target.value)}
            placeholder="Enter API key..."
            className="bg-background border-border mt-1"
          />
        </div>
        <Button
          size="sm"
          onClick={() => handleSave(type)}
          disabled={saving === type}
          className="w-full"
        >
          {saving === type ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save {label}
        </Button>
      </div>
    </TabsContent>
  );

  return (
    <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
      <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <Server className="w-4 h-4 text-primary" />
        Endpoints
      </h4>
      <Tabs defaultValue="https" className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-background">
          <TabsTrigger value="https" className="text-xs">
            <Globe className="w-3 h-3 mr-1" />
            HTTPS
          </TabsTrigger>
          <TabsTrigger value="ws" className="text-xs">
            <Radio className="w-3 h-3 mr-1" />
            WS
          </TabsTrigger>
          <TabsTrigger value="grpc" className="text-xs">
            <Server className="w-3 h-3 mr-1" />
            gRPC
          </TabsTrigger>
        </TabsList>
        {renderTabContent('https', <Globe className="w-4 h-4" />, 'HTTPS')}
        {renderTabContent('ws', <Radio className="w-4 h-4" />, 'WebSocket')}
        {renderTabContent('grpc', <Server className="w-4 h-4" />, 'gRPC')}
      </Tabs>
    </div>
  );
};

export default EndpointTabs;
