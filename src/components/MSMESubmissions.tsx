import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Download, Filter } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MSMESubmission {
  id: string;
  vendor_id: string;
  campaign_id: string;
  submitted_at: string;
  response_status: string;
  form_data: any;
  vendor?: {
    vendor_code: string;
    vendor_name: string;
  };
  campaign?: {
    name: string;
  };
}

export function MSMESubmissions() {
  const [submissions, setSubmissions] = useState<MSMESubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<MSMESubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      
      // Fetch submissions with vendor and campaign details
      const { data: submissionsData, error } = await supabase
        .from('msme_responses')
        .select(`
          *,
          vendors:vendor_id (
            vendor_code,
            vendor_name
          ),
          msme_campaigns:campaign_id (
            name
          )
        `)
        .order('submitted_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const processedSubmissions = (submissionsData || []).map(submission => ({
        ...submission,
        vendor: submission.vendors,
        campaign: submission.msme_campaigns
      })) as MSMESubmission[];

      setSubmissions(processedSubmissions);
      setFilteredSubmissions(processedSubmissions);
      setTotalCount(processedSubmissions.length);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch MSME submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterByDate = (date: Date | undefined) => {
    if (!date) {
      setFilteredSubmissions(submissions);
      return;
    }

    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    const filtered = submissions.filter(submission => {
      if (!submission.submitted_at) return false;
      const submissionDate = new Date(submission.submitted_at);
      return submissionDate >= startDate && submissionDate <= endDate;
    });

    setFilteredSubmissions(filtered);
  };

  const clearDateFilter = () => {
    setSelectedDate(undefined);
    setFilteredSubmissions(submissions);
  };

  const exportToCSV = () => {
    if (filteredSubmissions.length === 0) {
      toast({
        title: "No Data",
        description: "No submissions to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Vendor Code', 'Vendor Name', 'Campaign', 'Status', 'Submission Date', 'Form Data'];
    const rows = filteredSubmissions.map(submission => [
      submission.vendor?.vendor_code || '—',
      submission.vendor?.vendor_name || '—',
      submission.campaign?.name || '—',
      submission.response_status,
      submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—',
      JSON.stringify(submission.form_data || {})
    ]);

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `msme_submissions_${selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'all'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredSubmissions.length} submissions to CSV`,
    });
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    filterByDate(selectedDate);
  }, [selectedDate, submissions]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle>MSME Form Submissions</CardTitle>
            <CardDescription>
              Track vendor form submissions with detailed information and filtering
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            {selectedDate && (
              <Button variant="outline" size="sm" onClick={clearDateFilter}>
                Clear Filter
              </Button>
            )}
            
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Total Submissions: <strong>{totalCount}</strong></span>
          <span>Filtered Results: <strong>{filteredSubmissions.length}</strong></span>
          {selectedDate && (
            <span>Date: <strong>{format(selectedDate, "MMM dd, yyyy")}</strong></span>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading submissions...</div>
        ) : filteredSubmissions.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <ScrollArea className="h-[500px] w-full">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[120px]">Vendor Code</TableHead>
                    <TableHead className="w-[200px]">Vendor Name</TableHead>
                    <TableHead className="w-[150px]">Campaign</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[180px]">Submission Date</TableHead>
                    <TableHead className="w-[150px]">Form Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {submission.vendor?.vendor_code || '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {submission.vendor?.vendor_name || '—'}
                      </TableCell>
                      <TableCell className="truncate">
                        {submission.campaign?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(submission.response_status)}`}
                        >
                          {submission.response_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {submission.submitted_at ? (
                          <div>
                            <div>{format(new Date(submission.submitted_at), "MMM dd, yyyy")}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(submission.submitted_at), "hh:mm a")}
                            </div>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {submission.form_data && Object.keys(submission.form_data).length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-medium">Form Data</h4>
                                <ScrollArea className="h-40">
                                  <pre className="text-xs whitespace-pre-wrap">
                                    {JSON.stringify(submission.form_data, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-muted-foreground">No data</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {selectedDate ? 
              `No submissions found for ${format(selectedDate, "MMM dd, yyyy")}` : 
              "No MSME form submissions found."
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}