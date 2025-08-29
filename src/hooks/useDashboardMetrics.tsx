import { useQuery } from '@tanstack/react-query';
import fastApiClient from '@/lib/fastapi-client';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      try {
        // Get basic metrics from FastAPI analytics endpoint
        const metrics = await fastApiClient.analytics.getDashboardMetrics();
        
        // Get recent vendors for activity
        const recentVendors = await fastApiClient.vendors.getAll(0, 5);
        
        // Create recent activity from available data
        const activities = [
          ...(Array.isArray(recentVendors) ? recentVendors : []).map(vendor => ({
            type: 'vendor',
            title: `Vendor "${vendor.company_name}" added`,
            timestamp: vendor.created_at
          }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

        return {
          totalVendors: metrics?.totalVendors || (Array.isArray(recentVendors) ? recentVendors.length : 0),
          activeCampaigns: metrics?.activeCampaigns || 0,
          msmeCount: metrics?.msmeCount || 0,
          pendingResponses: metrics?.pendingResponses || 0,
          recentActivity: activities,
        };
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        
        // Fallback: get at least vendor count
        try {
          const vendors = await fastApiClient.vendors.getAll(0, 1000);
          const vendorCount = Array.isArray(vendors) ? vendors.length : 0;
          const msmeCount = Array.isArray(vendors) ? vendors.filter(v => v.msme_status?.toLowerCase() === 'micro' || v.msme_status?.toLowerCase() === 'small' || v.msme_status?.toLowerCase() === 'medium').length : 0;
          
          return {
            totalVendors: vendorCount,
            activeCampaigns: 0,
            msmeCount: msmeCount,
            pendingResponses: 0,
            recentActivity: [],
          };
        } catch (fallbackError) {
          console.error('Error in fallback metrics:', fallbackError);
          return {
            totalVendors: 0,
            activeCampaigns: 0,
            msmeCount: 0,
            pendingResponses: 0,
            recentActivity: [],
          };
        }
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });
}