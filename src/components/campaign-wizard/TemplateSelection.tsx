import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageCircle, Plus } from 'lucide-react';
import fastApiClient from '@/lib/fastapi-client';
import { CampaignFormData } from '@/pages/CreateCampaign';

interface TemplateSelectionProps {
  data: CampaignFormData;
  onUpdate: (data: Partial<CampaignFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string; // This should match backend schema
  variables?: string[];
  created_at?: string;
  updated_at?: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  variables?: string[];
  created_at?: string;
  updated_at?: string;
}

// Fallback templates in case API is not available
const FALLBACK_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'test-email-template-1',
    name: 'Basic MSME Status Update',
    subject: 'MSME Status Update Required',
    body: 'Dear {vendor_name}, Please update your MSME status information. Best regards, Amber Compliance Team',
    variables: ['vendor_name']
  },
  {
    id: 'email-fallback-2', 
    name: 'Welcome Email',
    subject: 'Welcome to Our MSME Program',
    body: 'Dear {vendor_name}, Welcome to our vendor program. We look forward to working with {company_name}.',
    variables: ['vendor_name', 'company_name']
  }
];

const FALLBACK_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'test-whatsapp-template-1',
    name: 'MSME Status WhatsApp',
    content: 'Hi {vendor_name}, please update your MSME status via our portal. Thank you!',
    variables: ['vendor_name']
  },
  {
    id: 'whatsapp-fallback-2',
    name: 'Status Update',
    content: 'Hi {vendor_name}, your MSME status has been updated to {status}. Please login to view details.',
    variables: ['vendor_name', 'status']
  }
];

export function TemplateSelection({ data, onUpdate, onNext, onPrev }: TemplateSelectionProps) {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching templates from FastAPI...');
      
      // First try to fetch templates from the API
      let emailTemplates: EmailTemplate[] = [];
      let whatsappTemplates: WhatsAppTemplate[] = [];
      
      try {
        console.log('Trying to fetch email templates...');
        const emailResponse = await fastApiClient.templates.getAll('email');
        emailTemplates = Array.isArray(emailResponse) ? emailResponse : [];
        console.log('Email templates fetched:', emailTemplates);
      } catch (emailError) {
        console.warn('Failed to fetch email templates, using fallbacks:', emailError);
        emailTemplates = FALLBACK_EMAIL_TEMPLATES;
      }
      
      try {
        console.log('Trying to fetch WhatsApp templates...');
        const whatsappResponse = await fastApiClient.templates.getAll('whatsapp');
        whatsappTemplates = Array.isArray(whatsappResponse) ? whatsappResponse : [];
        console.log('WhatsApp templates fetched:', whatsappTemplates);
      } catch (whatsappError) {
        console.warn('Failed to fetch WhatsApp templates, using fallbacks:', whatsappError);
        whatsappTemplates = FALLBACK_WHATSAPP_TEMPLATES;
      }
      
      // If both API calls failed but we got fallbacks, set a warning message
      if (emailTemplates === FALLBACK_EMAIL_TEMPLATES && whatsappTemplates === FALLBACK_WHATSAPP_TEMPLATES) {
        setError('Using demo templates. Backend may not be running or authenticated.');
      }

      setEmailTemplates(emailTemplates);
      setWhatsappTemplates(whatsappTemplates);
      
    } catch (error) {
      console.error('Error in fetchTemplates:', error);
      setError('Failed to load templates from server. Using demo templates.');
      // Set fallback templates on any error
      setEmailTemplates(FALLBACK_EMAIL_TEMPLATES);
      setWhatsappTemplates(FALLBACK_WHATSAPP_TEMPLATES);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    try {
      onNext();
    } catch (error) {
      console.error('Error in handleNext:', error);
      setError('Failed to proceed to next step. Please try again.');
    }
  };

  // Add error boundary protection
  if (error && !loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-amber-600 mb-4">{error}</div>
          <div className="space-x-2">
            <Button onClick={fetchTemplates} variant="outline">
              Retry Loading Templates
            </Button>
            <Button onClick={onPrev} variant="outline">
              Go Back
            </Button>
            {(emailTemplates.length > 0 || whatsappTemplates.length > 0) && (
              <Button onClick={handleNext}>
                Continue Anyway
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            Loading templates...
          </div>
        </CardContent>
      </Card>
    );
  }

  try {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose Communication Templates</CardTitle>
          <CardDescription>
            Select email and WhatsApp templates for your campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
          {/* Email Templates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Email Template</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/templates/email/create'}>
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>
            
            {emailTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="font-medium mb-2">No Email Templates Found</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first email template to get started
                  </p>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/templates/email/create'}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Email Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <RadioGroup
                value={data.emailTemplateId || ''}
                onValueChange={(value) => {
                  console.log('Email template selected:', value);
                  onUpdate({ emailTemplateId: value });
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {emailTemplates.map((template) => (
                    <div key={template.id} className="relative">
                      <RadioGroupItem
                        value={template.id}
                        id={`email-${template.id}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`email-${template.id}`}
                        className="flex flex-col space-y-2 rounded-lg border-2 border-muted p-4 hover:border-muted-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="secondary">Email</Badge>
                        </div>
                        <p className="text-sm font-medium">{template.subject}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.body.substring(0, 100)}...
                        </p>
                        {template.variables && template.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map((variable) => (
                              <Badge key={variable} variant="outline" className="text-xs">
                                {variable}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>

          {/* WhatsApp Templates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium">WhatsApp Template</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/templates/whatsapp/create'}>
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>
            
            {whatsappTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="font-medium mb-2">No WhatsApp Templates Found</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first WhatsApp template to get started
                  </p>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/templates/whatsapp/create'}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create WhatsApp Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <RadioGroup
                value={data.whatsappTemplateId || ''}
                onValueChange={(value) => {
                  console.log('WhatsApp template selected:', value);
                  onUpdate({ whatsappTemplateId: value });
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {whatsappTemplates.map((template) => (
                    <div key={template.id} className="relative">
                      <RadioGroupItem
                        value={template.id}
                        id={`whatsapp-${template.id}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`whatsapp-${template.id}`}
                        className="flex flex-col space-y-2 rounded-lg border-2 border-muted p-4 hover:border-muted-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            WhatsApp
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {template.content}
                        </p>
                        {template.variables && template.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map((variable) => (
                              <Badge key={variable} variant="outline" className="text-xs">
                                {variable}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onPrev}>
              Previous: Select Vendors
            </Button>
            <Button onClick={handleNext}>
              Next: Review & Launch
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  } catch (renderError) {
    console.error('Error rendering TemplateSelection:', renderError);
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-4">
            Something went wrong loading the template selection. Please try again.
          </div>
          <div className="space-x-2">
            <Button onClick={onPrev} variant="outline">
              Go Back
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
}