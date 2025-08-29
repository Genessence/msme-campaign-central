import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Users, Mail, MessageCircle, FileText } from 'lucide-react';
import { fastApiClient } from '@/lib/fastapi-client';
import { CampaignFormData } from '@/pages/CreateCampaign';
import { format } from 'date-fns';

interface CampaignReviewProps {
  data: CampaignFormData;
  onSubmit: (isDraft: boolean) => void;
  onPrev: () => void;
  isSubmitting: boolean;
}

interface Vendor {
  id: string;
  company_name: string;
  vendor_code: string;
  msme_status?: string;
  primary_contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  registration_number?: string;
  annual_turnover?: number;
  employee_count?: number;
  gst_compliance?: boolean;
  statutory_compliance?: boolean;
  financial_compliance?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string; // Changed from content to body to match backend
  created_at?: string;
  updated_at?: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export function CampaignReview({ data, onSubmit, onPrev, isSubmitting }: CampaignReviewProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState<WhatsAppTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('CampaignReview - data changed:', data);
    fetchReviewData();
  }, [data]);

  const fetchReviewData = async () => {
    try {
      console.log('Fetching review data for:', {
        selectedVendors: data.selectedVendors.length,
        emailTemplateId: data.emailTemplateId,
        whatsappTemplateId: data.whatsappTemplateId
      });

      // Fetch vendors in batches if there are many selected
      if (data.selectedVendors.length > 0) {
        await fetchVendorsInBatches();
      }

      // Fetch templates
      await Promise.all([
        data.emailTemplateId ? fetchEmailTemplate() : Promise.resolve(),
        data.whatsappTemplateId ? fetchWhatsAppTemplate() : Promise.resolve()
      ]);

    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorsInBatches = async () => {
    try {
      if (data.selectedVendors.length === 0) {
        console.log('No vendors selected');
        setVendors([]);
        return;
      }

      console.log('Fetching vendors with IDs:', data.selectedVendors);
      
      // Use FastAPI to get all vendors and filter by selected IDs
      const allVendors = await fastApiClient.vendors.getAll();
      console.log('All vendors from FastAPI:', allVendors.length);
      
      const selectedVendors = allVendors.filter(vendor => 
        data.selectedVendors.includes(vendor.id)
      );
      
      console.log('Filtered selected vendors:', selectedVendors.length);
      setVendors(selectedVendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchEmailTemplate = async () => {
    if (!data.emailTemplateId) {
      console.log('No email template ID provided');
      return;
    }
    
    try {
      console.log('Fetching email template with ID:', data.emailTemplateId);
      
      // Check if this is a fallback template ID
      if (data.emailTemplateId.startsWith('email-fallback-')) {
        console.log('Using fallback email template');
        const fallbackTemplate: EmailTemplate = {
          id: data.emailTemplateId,
          name: 'Demo Email Template',
          subject: 'MSME Status Update Required',
          body: 'Dear {vendor_name}, Please update your MSME status information. Best regards, Amber Compliance Team'
        };
        setEmailTemplate(fallbackTemplate);
        return;
      }
      
      const template = await fastApiClient.templates.getById(data.emailTemplateId);
      console.log('Email template fetched:', template);
      setEmailTemplate(template);
    } catch (error) {
      console.error('Error fetching email template:', error);
      // Fallback to a default display
      setEmailTemplate({
        id: data.emailTemplateId,
        name: 'Template (ID: ' + data.emailTemplateId.substring(0, 8) + '...)',
        subject: 'Email Template',
        body: 'Template content not available'
      });
    }
  };

  const fetchWhatsAppTemplate = async () => {
    if (!data.whatsappTemplateId) {
      console.log('No WhatsApp template ID provided');
      return;
    }
    
    try {
      console.log('Fetching WhatsApp template with ID:', data.whatsappTemplateId);
      
      // Check if this is a fallback template ID
      if (data.whatsappTemplateId.startsWith('whatsapp-fallback-')) {
        console.log('Using fallback WhatsApp template');
        const fallbackTemplate: WhatsAppTemplate = {
          id: data.whatsappTemplateId,
          name: 'Demo WhatsApp Template',
          content: 'Hi {vendor_name}, please update your MSME status via our portal. Thank you!'
        };
        setWhatsappTemplate(fallbackTemplate);
        return;
      }
      
      const template = await fastApiClient.templates.getById(data.whatsappTemplateId);
      console.log('WhatsApp template fetched:', template);
      setWhatsappTemplate(template);
    } catch (error) {
      console.error('Error fetching WhatsApp template:', error);
      // Fallback to a default display
      setWhatsappTemplate({
        id: data.whatsappTemplateId,
        name: 'Template (ID: ' + data.whatsappTemplateId.substring(0, 8) + '...)',
        content: 'Template content not available'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading campaign details...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & Launch Campaign</CardTitle>
        <CardDescription>
          Review all campaign details before launching
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Campaign Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Campaign Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Campaign Name</Label>
                <p className="text-lg font-medium">{data.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Deadline</Label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg">{format(new Date(data.deadline), 'PPP')}</p>
                </div>
              </div>
            </div>
            {data.description && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="text-sm">{data.description}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Target Vendors */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Target Vendors</h3>
              </div>
              <Badge variant="secondary">
                {vendors.length} vendors selected
              </Badge>
            </div>
            <div className="border rounded-lg">
              <div className="max-h-48 overflow-y-auto">
                {vendors.length > 0 ? (
                  <>
                    {vendors.length > 10 ? (
                      // Show summary for large lists
                      <div className="p-4 text-center">
                        <p className="font-medium">
                          {vendors.length} vendors selected
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Showing first 5 vendors:
                        </p>
                        <div className="mt-3 space-y-2">
                          {vendors.slice(0, 5).map((vendor, index) => (
                            <div key={vendor.id} className="text-left p-2 border rounded">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{vendor.company_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {vendor.vendor_code}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {vendor.msme_status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          ... and {vendors.length - 5} more vendors
                        </p>
                      </div>
                    ) : (
                      // Show full list for smaller lists
                      vendors.map((vendor, index) => (
                        <div key={vendor.id} className={`p-3 ${index < vendors.length - 1 ? 'border-b' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{vendor.company_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {vendor.vendor_code} • {vendor.email}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Badge variant="outline">
                                {vendor.msme_status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No vendors data available
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Templates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Communication Templates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email Template */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Email Template</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {emailTemplate ? (
                    <div className="space-y-2">
                      <p className="font-medium">{emailTemplate.name}</p>
                      <p className="text-sm text-muted-foreground">{emailTemplate.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {emailTemplate.body.substring(0, 80)}...
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No email template selected</p>
                  )}
                </CardContent>
              </Card>

              {/* WhatsApp Template */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <CardTitle className="text-base">WhatsApp Template</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {whatsappTemplate ? (
                    <div className="space-y-2">
                      <p className="font-medium">{whatsappTemplate.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {whatsappTemplate.content}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No WhatsApp template selected</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Campaign Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Target Vendors</p>
                <p className="font-medium">{vendors.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email Template</p>
                <p className="font-medium">{emailTemplate ? 'Selected' : 'None'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">WhatsApp Template</p>
                <p className="font-medium">{whatsappTemplate ? 'Selected' : 'None'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Deadline</p>
                <p className="font-medium">{format(new Date(data.deadline), 'MMM dd')}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onPrev} disabled={isSubmitting}>
              Previous: Templates
            </Button>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={() => onSubmit(true)}
                disabled={isSubmitting}
              >
                Save as Draft
              </Button>
              <Button 
                onClick={() => onSubmit(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Launching...' : 'Launch Campaign'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}