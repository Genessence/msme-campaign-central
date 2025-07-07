import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function CreateEmailTemplate() {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    variables: [] as string[],
  });
  const [newVariable, setNewVariable] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tinymceApiKey, setTinymceApiKey] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTinymceApiKey();
  }, []);

  const fetchTinymceApiKey = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-tinymce-key');
      
      if (error) {
        console.error('Error fetching TinyMCE API key:', error);
        return;
      }

      if (data?.apiKey) {
        setTinymceApiKey(data.apiKey);
      }
    } catch (error) {
      console.error('Error fetching TinyMCE API key:', error);
    }
  };

  const handleEditorChange = (content: string) => {
    setFormData(prev => ({ ...prev, body: content }));
  };

  const addVariable = () => {
    if (newVariable.trim() && !formData.variables.includes(newVariable.trim())) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, newVariable.trim()]
      }));
      setNewVariable('');
    }
  };

  const removeVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('email_templates')
        .insert([{
          name: formData.name.trim(),
          subject: formData.subject.trim(),
          body: formData.body,
          variables: formData.variables,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Email template created successfully.",
      });

      navigate('/templates');
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create email template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Email Template</h1>
          <p className="text-muted-foreground">
            Create a new email template for your campaigns
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/templates')}
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
            <CardDescription>
              Basic information about your email template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter email subject"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Variables</Label>
              <div className="flex gap-2">
                <Input
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  placeholder="Add variable (e.g., vendor_name)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                />
                <Button type="button" onClick={addVariable} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.variables.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.variables.map((variable) => (
                    <Badge key={variable} variant="secondary" className="flex items-center gap-1">
                      {variable}
                      <button
                        type="button"
                        onClick={() => removeVariable(variable)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Variables can be used in the email body as {"{variable_name}"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Content</CardTitle>
            <CardDescription>
              Design your email template using the rich text editor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Email Body *</Label>
              <div className="border rounded-md">
                <Editor
                  apiKey={tinymceApiKey}
                  value={formData.body}
                  onEditorChange={handleEditorChange}
                  init={{
                    height: 400,
                    menubar: false,
                    plugins: [
                      'advlist autolink lists link image charmap print preview anchor',
                      'searchreplace visualblocks code fullscreen',
                      'insertdatetime media table paste code help wordcount'
                    ],
                    toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
                    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px }',
                    placeholder: 'Enter your email content here...',
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Use variables in your content like {"{vendor_name}"} to personalize emails
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/templates')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Template'}
          </Button>
        </div>
      </form>
    </div>
  );
}