import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Eye, Edit, Copy, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomForm {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
  _count?: {
    responses: number;
  };
}

export default function Forms() {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_forms')
        .select(`
          *,
          form_responses(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formsWithCount = data?.map(form => ({
        ...form,
        _count: {
          responses: form.form_responses?.length || 0
        }
      }));

      setForms(formsWithCount || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch forms",
        variant: "destructive",
      });
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form deleted successfully",
      });
      
      fetchForms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete form",
        variant: "destructive",
      });
      console.error('Error deleting form:', error);
    }
  };

  const toggleFormStatus = async (formId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('custom_forms')
        .update({ is_active: !currentStatus })
        .eq('id', formId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Form ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      
      fetchForms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update form status",
        variant: "destructive",
      });
      console.error('Error updating form status:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Forms</h1>
          <p className="text-muted-foreground">
            Create and manage custom forms for your campaigns
          </p>
        </div>
        <Button asChild>
          <Link to="/forms/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Form
          </Link>
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No forms created yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first custom form
              </p>
              <Button asChild>
                <Link to="/forms/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Form
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{form.name}</CardTitle>
                  <Badge variant={form.is_active ? "default" : "secondary"}>
                    {form.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>{form.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{form._count?.responses || 0}</span> responses
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/forms/${form.slug}`} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/forms/${form.id}/edit`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/forms/${form.id}/responses`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Responses
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFormStatus(form.id, form.is_active)}
                    >
                      {form.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteForm(form.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Public URL: /forms/{form.slug}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}