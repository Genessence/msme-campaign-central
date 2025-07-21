import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Users, Mail, MessageCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { CampaignFormData } from '@/pages/CreateCampaign';
import { format } from 'date-fns';

interface CampaignReviewProps {
  data: CampaignFormData;
  onSubmit: (isDraft: boolean) => void;
  onPrev: () => void;
  isSubmitting: boolean;
}

type Vendor = Tables<'vendors'>;
type EmailTemplate = Tables<'email_templates'>;
type WhatsAppTemplate = Tables<'whatsapp_templates'>;

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
      const promises = [];

      // Fetch selected vendors
      if (data.selectedVendors.length > 0) {
        promises.push(
          supabase
            .from('vendors')
            .select('*')
            .in('id', data.selectedVendors)
        );
      }

      // Fetch email template
      if (data.emailTemplateId) {
        promises.push(
          supabase
            .from('email_templates')
            .select('*')
            .eq('id', data.emailTemplateId)
            .single()
        );
      }

      // Fetch WhatsApp template
      if (data.whatsappTemplateId) {
        promises.push(
          supabase
            .from('whatsapp_templates')
            .select('*')
            .eq('id', data.whatsappTemplateId)
            .single()
        );
      }

      const results = await Promise.allSettled(promises);
      
      let resultIndex = 0;
      
      // Process vendors result
      if (data.selectedVendors.length > 0) {
        const vendorsResult = results[resultIndex++];
        if (vendorsResult.status === 'fulfilled' && !vendorsResult.value.error) {
          setVendors(vendorsResult.value.data || []);
        }
      }

      // Process email template result
      if (data.emailTemplateId) {
        const emailResult = results[resultIndex++];
        if (emailResult.status === 'fulfilled' && !emailResult.value.error) {
          setEmailTemplate(emailResult.value.data);
        }
      }

      // Process WhatsApp template result
      if (data.whatsappTemplateId) {
        const whatsappResult = results[resultIndex++];
        if (whatsappResult.status === 'fulfilled' && !whatsappResult.value.error) {
          setWhatsappTemplate(whatsappResult.value.data);
        }
      }
    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoading(false);
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
                {vendors.map((vendor, index) => (
                  <div key={vendor.id} className={`p-3 ${index < vendors.length - 1 ? 'border-b' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{vendor.vendor_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {vendor.vendor_code} • {vendor.email}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge variant="outline">
                          {vendor.msme_status}
                        </Badge>
                        {vendor.group_category && (
                          <Badge variant="secondary">
                            {vendor.group_category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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