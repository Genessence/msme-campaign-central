import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Vendor = Tables<'vendors'>;

interface MSMEStats {
  MSME: number;
  'Non MSME': number;
  Others: number;
  total: number;
}

interface CategoryStats {
  Micro: number;
  Small: number;
  Medium: number;
  Others: number;
}

const COLORS = {
  MSME: '#10b981', // green
  'Non MSME': '#ef4444', // red
  Others: '#f59e0b', // amber
};

const CATEGORY_COLORS = {
  Micro: '#3b82f6', // blue
  Small: '#8b5cf6', // purple
  Medium: '#f97316', // orange
  Others: '#6b7280', // gray
};

export default function Analytics() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msmeStats, setMsmeStats] = useState<MSMEStats>({
    MSME: 0,
    'Non MSME': 0,
    Others: 0,
    total: 0,
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({
    Micro: 0,
    Small: 0,
    Medium: 0,
    Others: 0,
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*');

      if (error) throw error;

      setVendors(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (vendorData: Vendor[]) => {
    const msmeStatusCounts: MSMEStats = {
      MSME: 0,
      'Non MSME': 0,
      Others: 0,
      total: vendorData.length,
    };

    const categoryCounts: CategoryStats = {
      Micro: 0,
      Small: 0,
      Medium: 0,
      Others: 0,
    };

    vendorData.forEach(vendor => {
      const status = vendor.msme_status || 'Others';
      if (status in msmeStatusCounts) {
        msmeStatusCounts[status as keyof Omit<MSMEStats, 'total'>]++;
      }

      const category = vendor.msme_category || 'Others';
      if (category in categoryCounts) {
        categoryCounts[category as keyof CategoryStats]++;
      }
    });

    setMsmeStats(msmeStatusCounts);
    setCategoryStats(categoryCounts);
  };

  const msmeChartData = [
    { name: 'MSME', value: msmeStats.MSME, color: COLORS.MSME },
    { name: 'Non MSME', value: msmeStats['Non MSME'], color: COLORS['Non MSME'] },
    { name: 'Others', value: msmeStats.Others, color: COLORS.Others },
  ].filter(item => item.value > 0);

  const categoryChartData = [
    { name: 'Micro', value: categoryStats.Micro, color: CATEGORY_COLORS.Micro },
    { name: 'Small', value: categoryStats.Small, color: CATEGORY_COLORS.Small },
    { name: 'Medium', value: categoryStats.Medium, color: CATEGORY_COLORS.Medium },
    { name: 'Others', value: categoryStats.Others, color: CATEGORY_COLORS.Others },
  ].filter(item => item.value > 0);

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into your vendor MSME status and categories
        </p>
      </div>

      <Tabs defaultValue="msme-status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="msme-status">MSME Status</TabsTrigger>
          <TabsTrigger value="categories">MSME Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="msme-status" className="space-y-6">
          {/* MSME Status Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{msmeStats.total}</div>
                <p className="text-xs text-muted-foreground">All registered vendors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MSME Certified</CardTitle>
                <Badge className="bg-green-50 text-green-700 border-green-200">
                  {getPercentage(msmeStats.MSME, msmeStats.total)}%
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{msmeStats.MSME}</div>
                <p className="text-xs text-muted-foreground">Certified MSME vendors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Non MSME</CardTitle>
                <Badge className="bg-red-50 text-red-700 border-red-200">
                  {getPercentage(msmeStats['Non MSME'], msmeStats.total)}%
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{msmeStats['Non MSME']}</div>
                <p className="text-xs text-muted-foreground">Non-MSME vendors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Others/Pending</CardTitle>
                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {getPercentage(msmeStats.Others, msmeStats.total)}%
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{msmeStats.Others}</div>
                <p className="text-xs text-muted-foreground">Pending or other status</p>
              </CardContent>
            </Card>
          </div>

          {/* MSME Status Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>MSME Status Distribution</CardTitle>
                <CardDescription>Pie chart showing vendor status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {msmeChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      MSME: { label: "MSME", color: COLORS.MSME },
                      "Non MSME": { label: "Non MSME", color: COLORS["Non MSME"] },
                      Others: { label: "Others", color: COLORS.Others },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={msmeChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {msmeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MSME Status Comparison</CardTitle>
                <CardDescription>Bar chart comparing vendor statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {msmeChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      value: { label: "Count", color: "hsl(var(--primary))" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={msmeChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {/* MSME Category Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Micro Enterprises</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{categoryStats.Micro}</div>
                <p className="text-xs text-muted-foreground">
                  {getPercentage(categoryStats.Micro, msmeStats.total)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Small Enterprises</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{categoryStats.Small}</div>
                <p className="text-xs text-muted-foreground">
                  {getPercentage(categoryStats.Small, msmeStats.total)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medium Enterprises</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{categoryStats.Medium}</div>
                <p className="text-xs text-muted-foreground">
                  {getPercentage(categoryStats.Medium, msmeStats.total)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Others</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{categoryStats.Others}</div>
                <p className="text-xs text-muted-foreground">
                  {getPercentage(categoryStats.Others, msmeStats.total)}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* MSME Category Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>MSME Category Distribution</CardTitle>
                <CardDescription>Breakdown by enterprise size</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      Micro: { label: "Micro", color: CATEGORY_COLORS.Micro },
                      Small: { label: "Small", color: CATEGORY_COLORS.Small },
                      Medium: { label: "Medium", color: CATEGORY_COLORS.Medium },
                      Others: { label: "Others", color: CATEGORY_COLORS.Others },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Comparison</CardTitle>
                <CardDescription>Bar chart comparing enterprise categories</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      value: { label: "Count", color: "hsl(var(--primary))" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}