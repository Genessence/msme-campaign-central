import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Send, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import fastApiClient from '@/lib/fastapi-client';

interface Vendor {
  id: string;
  company_name: string;
  contact_person_name?: string;
  email: string;
  vendor_code: string;
}

interface Template {
  id: string;
  name: string;
  subject?: string;
  body?: string;
  content?: string;
}

interface CampaignEmailSenderProps {
  campaignId: string;
  campaignName: string;
}

export default function CampaignEmailSender({ campaignId, campaignName }: CampaignEmailSenderProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateType, setTemplateType] = useState<'email' | 'whatsapp'>('email');
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVendors();
    loadTemplates();
  }, [templateType]);

  const loadVendors = async () => {
    try {
      const vendorData = await fastApiClient.vendors.getAll(0, 100);
      setVendors(vendorData);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    }
  };

  const loadTemplates = async () => {
    try {
      const templateData = await fastApiClient.templates.getAll(templateType);
      setTemplates(templateData);
      if (templateData.length > 0 && !selectedTemplate) {
        setSelectedTemplate(templateData[0].id);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    }
  };

  const handleVendorToggle = (vendorId: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSelectAll = () => {
    const vendorsWithEmail = vendors.filter(v => v.email);
    setSelectedVendors(
      selectedVendors.length === vendorsWithEmail.length 
        ? [] 
        : vendorsWithEmail.map(v => v.id)
    );
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !selectedTemplate) {
      toast({
        title: "Missing Information",
        description: "Please enter a test email address and select a template",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await fastApiClient.campaigns.testEmail(
        campaignId,
        testEmail,
        selectedTemplate,
        templateType
      );
      
      toast({
        title: "Success",
        description: result.message || "Test email sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestSmtpConfig = async () => {
    setLoading(true);
    try {
      const result = await fastApiClient.campaigns.testSmtpConfig();
      setSmtpStatus(result);
      
      if (result.connection_test && result.connection_test.success) {
        toast({
          title: "SMTP Configuration OK",
          description: "SMTP server connection successful",
        });
      } else {
        toast({
          title: "SMTP Configuration Issue",
          description: result.connection_test?.message || "SMTP connection failed",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to test SMTP configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    if (selectedVendors.length === 0 || !selectedTemplate) {
      toast({
        title: "Missing Information",
        description: "Please select vendors and a template",
        variant: "destructive",
      });
      return;
    }

    const estimatedBatches = Math.ceil(selectedVendors.length / 100);
    const estimatedTime = estimatedBatches * 3; // 3 seconds per batch

    const proceed = window.confirm(
      `Send emails to ${selectedVendors.length} vendors?\n\n` +
      `This will be processed in ${estimatedBatches} batch(es) of 100 emails.\n` +
      `Estimated time: ${estimatedTime} seconds (${Math.ceil(estimatedTime / 60)} minutes)\n\n` +
      `Click OK to proceed.`
    );

    if (!proceed) return;

    setSendingEmails(true);
    try {
      const result = await fastApiClient.campaigns.sendEmails(
        campaignId,
        selectedVendors,
        selectedTemplate,
        templateType,
        false // test_mode = false for actual sending
      );
      
      toast({
        title: "Batch Email Processing Started",
        description: `Emails are being sent to ${selectedVendors.length} vendors in batches of 100. Processing will take approximately ${estimatedTime} seconds.`,
      });
      
      // Clear selections after successful send
      setSelectedVendors([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send emails",
        variant: "destructive",
      });
    } finally {
      setSendingEmails(false);
    }
  };

  const vendorsWithEmail = vendors.filter(v => v.email);
  const selectedTemplate_obj = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Template Selection
          </CardTitle>
          <CardDescription>
            Choose the template to send to vendors for "{campaignName}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="email"
                name="templateType"
                value="email"
                checked={templateType === 'email'}
                onChange={(e) => setTemplateType(e.target.value as 'email' | 'whatsapp')}
              />
              <label htmlFor="email">Email Template</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="whatsapp"
                name="templateType"
                value="whatsapp"
                checked={templateType === 'whatsapp'}
                onChange={(e) => setTemplateType(e.target.value as 'email' | 'whatsapp')}
              />
              <label htmlFor="whatsapp">WhatsApp Template</label>
            </div>
          </div>

          {templates.length > 0 ? (
            <div>
              <label className="block text-sm font-medium mb-2">Select Template:</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              
              {selectedTemplate_obj && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <h4 className="font-medium">Preview:</h4>
                  {templateType === 'email' && selectedTemplate_obj.subject && (
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Subject:</strong> {selectedTemplate_obj.subject}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Content:</strong> {(selectedTemplate_obj.body || selectedTemplate_obj.content || '').substring(0, 200)}...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No {templateType} templates found. Please create a template first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Email
          </CardTitle>
          <CardDescription>
            Send a test email to verify the template and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              onClick={handleTestSmtpConfig}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Test SMTP Config
            </Button>
          </div>
          
          {smtpStatus && (
            <div className="p-3 bg-gray-50 rounded-md text-sm">
              <p><strong>Server:</strong> {smtpStatus.smtp_server}:{smtpStatus.smtp_port}</p>
              <p><strong>Username:</strong> {smtpStatus.smtp_username}</p>
              <p><strong>Status:</strong> {smtpStatus.connection_test?.success ? '✅ Connected' : '❌ Failed'}</p>
              {smtpStatus.connection_test?.details && (
                <p><strong>Details:</strong> {smtpStatus.connection_test.details}</p>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter test email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSendTestEmail}
              disabled={loading || !selectedTemplate}
              variant="outline"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Send Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Select Vendors
          </CardTitle>
          <CardDescription>
            Choose which vendors to send emails to ({vendorsWithEmail.length} vendors with email addresses)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {vendorsWithEmail.length > 0 ? (
            <>
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedVendors.length === vendorsWithEmail.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm text-gray-600">
                  {selectedVendors.length} of {vendorsWithEmail.length} selected
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {vendorsWithEmail.map(vendor => (
                  <div
                    key={vendor.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      id={vendor.id}
                      checked={selectedVendors.includes(vendor.id)}
                      onCheckedChange={() => handleVendorToggle(vendor.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={vendor.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {vendor.company_name}
                      </label>
                      <p className="text-xs text-gray-500 truncate">
                        {vendor.contact_person_name} • {vendor.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSendEmails}
                  disabled={sendingEmails || selectedVendors.length === 0 || !selectedTemplate}
                  className="min-w-32"
                >
                  {sendingEmails ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send to {selectedVendors.length} Vendor{selectedVendors.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </>
          ) : (
            <Alert>
              <AlertDescription>
                No vendors with email addresses found. Please add vendor email addresses first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
