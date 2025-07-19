import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { DynamicForm } from "@/components/DynamicForm";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Building, FileText } from "lucide-react";
import amberLogo from "@/assets/amber-logo.png";

interface FormField {
  id: string;
  field_type: string;
  field_name: string;
  label: string;
  is_required: boolean;
  validation_rules: any;
  options: any;
  order_index: number;
}

interface CustomForm {
  id: string;
  name: string;
  title: string;
  description: string;
  slug: string;
  settings: any;
}

export default function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<CustomForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchForm();
  }, [slug]);

  const fetchForm = async () => {
    try {
      // Fetch form details
      const { data: formData, error: formError } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (formError) {
        if (formError.code === 'PGRST116') {
          setError('Form not found or is inactive');
        } else {
          throw formError;
        }
        return;
      }

      setForm(formData);

      // Fetch form fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formData.id)
        .order('order_index');

      if (fieldsError) throw fieldsError;

      setFields(fieldsData || []);
    } catch (error: any) {
      console.error('Error fetching form:', error);
      setError('Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-6 shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-3">
              <img src={amberLogo} alt="Amber" className="h-10 w-auto" />
              <div className="text-center">
                <h1 className="text-xl font-bold">Amber Compliance</h1>
                <p className="text-sm opacity-90">Loading Form...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading form, please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-6 shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-3">
              <img src={amberLogo} alt="Amber" className="h-10 w-auto" />
              <div className="text-center">
                <h1 className="text-xl font-bold">Amber Compliance</h1>
                <p className="text-sm opacity-90">Form Access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Card className="shadow-lg border-destructive/20">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-destructive">Form Not Available</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">{error}</p>
                <p className="text-sm text-muted-foreground">
                  Please check the URL or contact the form administrator.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-6 shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-3">
              <img src={amberLogo} alt="Amber" className="h-10 w-auto" />
              <div className="text-center">
                <h1 className="text-xl font-bold">Amber Compliance</h1>
                <p className="text-sm opacity-90">Form Submitted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Success Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg border-green-200">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-700 mb-2">Submission Successful!</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-lg text-muted-foreground mb-6">
                  Thank you for your submission. Your response has been recorded successfully.
                </p>
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="font-semibold mb-2">What happens next?</h3>
                  <p className="text-sm text-muted-foreground">
                    Your submission will be reviewed by our team. If any additional information is needed, 
                    we will contact you using the details provided in this form.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3">
            <img src={amberLogo} alt="Amber" className="h-10 w-auto" />
            <div className="text-center">
              <h1 className="text-xl font-bold">Amber Compliance</h1>
              <p className="text-sm opacity-90">Digital Form System</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="py-8">
        <DynamicForm
          form={form}
          fields={fields}
          onSuccess={handleFormSuccess}
        />
      </div>

      {/* Footer */}
      <footer className="bg-muted/30 border-t py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
            <Building className="h-4 w-4" />
            <span>Powered by Amber Compliance System</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Secure • Reliable • Compliant
          </p>
        </div>
      </footer>
    </div>
  );
}