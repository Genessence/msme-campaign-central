import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Eye, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface FormResponse {
  id: string;
  response_data: any;
  submitted_at: string;
  created_at: string;
  ip_address?: string;
}

interface CustomForm {
  id: string;
  name: string;
  title: string;
  description: string;
  slug: string;
}

export default function FormResponses() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [form, setForm] = useState<CustomForm | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch form details
      const { data: formData, error: formError } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('id', id)
        .single();

      if (formError) throw formError;
      setForm(formData);

      // Fetch form responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', id)
        .order('submitted_at', { ascending: false });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load form responses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (responses.length === 0) {
      toast({
        title: "No Data",
        description: "No responses to export",
        variant: "destructive",
      });
      return;
    }

    // Get all unique keys from all responses
    const allKeys = new Set<string>();
    responses.forEach(response => {
      Object.keys(response.response_data || {}).forEach(key => allKeys.add(key));
    });

    const headers = ['Submission Date', ...Array.from(allKeys)];
    
    const csvContent = [
      headers.join(','),
      ...responses.map(response => {
        const row = [
          format(new Date(response.submitted_at), 'yyyy-MM-dd HH:mm:ss'),
          ...Array.from(allKeys).map(key => {
            const value = response.response_data?.[key] || '';
            // Escape quotes and wrap in quotes if contains comma or quotes
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
        ];
        return row.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form?.name || 'form'}-responses.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Responses exported successfully",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Form not found</h1>
            <Button onClick={() => navigate('/forms')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/forms')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Form Responses</h1>
                <p className="text-gray-600">{form.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {responses.length} responses
              </Badge>
              <Button variant="outline" onClick={exportToCSV} disabled={responses.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {responses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No responses yet</h3>
              <p className="text-gray-600 text-center">
                Once people start submitting your form, their responses will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submission Date</TableHead>
                      <TableHead>Response Data</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{format(new Date(response.submitted_at), 'MMM dd, yyyy')}</span>
                            <span className="text-sm text-gray-500">
                              {format(new Date(response.submitted_at), 'HH:mm')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {Object.keys(response.response_data || {}).length > 0 ? (
                              <div className="space-y-1">
                                {Object.entries(response.response_data || {}).slice(0, 2).map(([key, value]) => (
                                  <div key={key} className="truncate">
                                    <span className="font-medium">{key}:</span> {String(value)}
                                  </div>
                                ))}
                                {Object.keys(response.response_data || {}).length > 2 && (
                                  <div className="text-gray-500">
                                    +{Object.keys(response.response_data || {}).length - 2} more fields
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">No data</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Response Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="font-medium">Submitted:</span>
                                      <div>{format(new Date(response.submitted_at), 'MMM dd, yyyy HH:mm:ss')}</div>
                                    </div>
                                    {response.ip_address && (
                                      <div>
                                        <span className="font-medium">IP Address:</span>
                                        <div>{response.ip_address}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-3">Form Data</h4>
                                  <div className="space-y-3">
                                    {Object.entries(response.response_data || {}).map(([key, value]) => (
                                      <div key={key} className="border-b pb-2">
                                        <div className="font-medium text-sm text-gray-600 mb-1">{key}</div>
                                        <div className="text-sm break-words">{String(value)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}