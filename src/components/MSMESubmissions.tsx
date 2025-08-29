import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [submissions] = useState<MSMESubmission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // For now, we'll show an empty state since MSME submissions 
    // are not yet implemented in the FastAPI backend
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MSME Submissions</CardTitle>
          <CardDescription>Loading submissions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading MSME submissions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>MSME Submissions ({submissions.length})</CardTitle>
        <CardDescription>
          Recent MSME status update submissions from vendors
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No MSME submissions found. Submissions will appear here once vendors respond to campaigns.
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[120px]">Vendor Code</TableHead>
                    <TableHead className="w-[150px]">Vendor Name</TableHead>
                    <TableHead className="w-[150px]">Campaign</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {submission.vendor?.vendor_code || '—'}
                      </TableCell>
                      <TableCell>
                        {submission.vendor?.vendor_name || '—'}
                      </TableCell>
                      <TableCell>
                        {submission.campaign?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={submission.response_status === 'Completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {submission.response_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
