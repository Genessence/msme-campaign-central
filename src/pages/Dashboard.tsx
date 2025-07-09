import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading } = useDashboardMetrics();

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.totalVendors}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalVendors === 0 ? 'No vendors added yet' : 'Total registered vendors'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.activeCampaigns}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeCampaigns === 0 ? 'No active campaigns' : 'Currently running campaigns'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No. of MSMEs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.msmeCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalVendors && metrics?.totalVendors > 0 
                ? `${Math.round((metrics?.msmeCount || 0) / metrics.totalVendors * 100)}% of total vendors`
                : 'No MSME vendors yet'
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.pendingResponses}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.pendingResponses === 0 ? 'No pending responses' : 'Awaiting MSME form submissions'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with these common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              className="h-auto p-6 flex flex-col items-center space-y-2"
              onClick={() => navigate('/campaigns/create')}
            >
              <div className="text-lg font-semibold">Create Campaign</div>
              <div className="text-sm text-center text-muted-foreground">
                Start a new MSME status update campaign
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-center space-y-2"
              onClick={() => navigate('/vendors')}
            >
              <div className="text-lg font-semibold">Manage Vendors</div>
              <div className="text-sm text-center text-muted-foreground">
                Add, edit, or import vendor information
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-center space-y-2"
              onClick={() => navigate('/analytics')}
            >
              <div className="text-lg font-semibold">View Analytics</div>
              <div className="text-sm text-center text-muted-foreground">
                Track campaign performance and compliance
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates and actions in your MSME management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No recent activity to show. Start by creating your first campaign or adding vendors.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}