import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      // Get total vendors count
      const { count: totalVendors } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true });

      // Get active campaigns count
      const { count: activeCampaigns } = await supabase
        .from('msme_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');

      // Get MSME count (vendors with MSME status)
      const { count: msmeCount } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('msme_status', 'MSME');

      // Get pending responses count
      const { count: pendingResponses } = await supabase
        .from('msme_responses')
        .select('*', { count: 'exact', head: true })
        .eq('response_status', 'Pending');

      return {
        totalVendors: totalVendors || 0,
        activeCampaigns: activeCampaigns || 0,
        msmeCount: msmeCount || 0,
        pendingResponses: pendingResponses || 0,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });
}