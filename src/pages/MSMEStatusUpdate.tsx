import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Upload, FileText, Building, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Zod schema for form validation
const msmeFormSchema = z.object({
  vendorCode: z.string().min(3, 'Vendor code must be at least 3 characters'),
  vendorName: z.string().min(2, 'Vendor name must be at least 2 characters'),
  businessAddress: z.string().min(10, 'Business address must be at least 10 characters'),
  msmeStatus: z.enum(['MSME Certified', 'Non MSME'], {
    required_error: 'Please select your MSME status',
  }),
  msmeCategory: z.enum(['Micro Enterprise', 'Small Enterprise', 'Medium Enterprise']).optional(),
  udyamNumber: z.string().optional(),
  certificate: z.any().optional(),
  nonMsmeDeclaration: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // Conditional validation for MSME Certified
  if (data.msmeStatus === 'MSME Certified') {
    if (!data.msmeCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MSME category is required when MSME certified',
        path: ['msmeCategory'],
      });
    }
    if (!data.udyamNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Udyam registration number is required when MSME certified',
        path: ['udyamNumber'],
      });
    } else if (!/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(data.udyamNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Udyam number must follow format: UDYAM-XX-XX-XXXXXXX',
        path: ['udyamNumber'],
      });
    }
  }
  
  // Conditional validation for Non MSME
  if (data.msmeStatus === 'Non MSME') {
    if (!data.nonMsmeDeclaration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Declaration is required when selecting Non MSME',
        path: ['nonMsmeDeclaration'],
      });
    }
  }
});

type MSMEFormData = z.infer<typeof msmeFormSchema>;

export default function MSMEStatusUpdate() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const form = useForm<MSMEFormData>({
    resolver: zodResolver(msmeFormSchema),
    defaultValues: {
      vendorCode: '',
      vendorName: '',
      businessAddress: '',
      nonMsmeDeclaration: false,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const msmeStatus = watch('msmeStatus');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF, PNG, or JPG files only.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload files smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      setValue('certificate', file);
    }
  };

  const onSubmit = async (data: MSMEFormData) => {
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Check if vendor exists and update or create
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('vendor_code', data.vendorCode)
        .maybeSingle();

      // Prepare vendor data
      const vendorData = {
        vendor_code: data.vendorCode,
        vendor_name: data.vendorName,
        location: data.businessAddress,
        msme_status: data.msmeStatus as any,
        msme_category: data.msmeStatus === 'MSME Certified' 
          ? (data.msmeCategory === 'Micro Enterprise' ? 'Micro' 
             : data.msmeCategory === 'Small Enterprise' ? 'Small' 
             : 'Medium') as any
          : null,
        udyam_number: data.msmeStatus === 'MSME Certified' ? data.udyamNumber : null,
        last_updated_date: new Date().toISOString(),
      };

      let vendorId: string;

      if (existingVendor) {
        // Update existing vendor
        const { error: updateError } = await supabase
          .from('vendors')
          .update(vendorData)
          .eq('id', existingVendor.id);

        if (updateError) throw updateError;
        vendorId = existingVendor.id;
      } else {
        // Create new vendor
        const { data: newVendor, error: insertError } = await supabase
          .from('vendors')
          .insert([vendorData])
          .select('id')
          .single();

        if (insertError) throw insertError;
        vendorId = newVendor.id;
      }

      // Create response record
      const responseData = {
        vendor_id: vendorId,
        response_status: 'Completed' as any,
        form_data: {
          vendorCode: data.vendorCode,
          vendorName: data.vendorName,
          businessAddress: data.businessAddress,
          msmeStatus: data.msmeStatus,
          msmeCategory: data.msmeCategory,
          udyamNumber: data.udyamNumber,
          nonMsmeDeclaration: data.nonMsmeDeclaration,
          submittedAt: new Date().toISOString(),
        },
        submitted_at: new Date().toISOString(),
      };

      const { error: responseError } = await supabase
        .from('msme_responses')
        .insert([responseData]);

      if (responseError) throw responseError;

      // Handle file upload if present
      if (data.certificate && data.msmeStatus === 'MSME Certified') {
        // Note: For file upload, you might want to set up Supabase Storage
        // This is a placeholder for the file upload logic
        console.log('File upload would happen here:', data.certificate);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setSubmitSuccess(true);
        toast({
          title: "Success!",
          description: "Your MSME status has been updated successfully.",
        });
      }, 500);

    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Building className="h-12 w-12 text-primary mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">MSME Status Portal</h1>
                <p className="text-gray-600">Ministry of Micro, Small and Medium Enterprises</p>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="text-center">
              <CardContent className="p-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Submission Successful!
                </h2>
                <p className="text-gray-600 mb-6">
                  Thank you for updating your MSME status. Your information has been recorded successfully.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">
                    <strong>Next Steps:</strong> You will receive a confirmation email shortly. 
                    If you have any questions, please contact our support team.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building className="h-12 w-12 text-primary mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">MSME Status Portal</h1>
              <p className="text-gray-600">Ministry of Micro, Small and Medium Enterprises</p>
            </div>
          </div>
          <div className="max-w-2xl mx-auto">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Please update your MSME certification status to ensure compliance with government regulations.
                All information provided will be kept confidential and used for official purposes only.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Please provide your basic business information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vendorCode">
                      Vendor Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="vendorCode"
                      {...register('vendorCode')}
                      placeholder="Enter your vendor code"
                      className={errors.vendorCode ? 'border-red-500' : ''}
                    />
                    {errors.vendorCode && (
                      <p className="text-red-500 text-sm flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.vendorCode.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendorName">
                      Vendor Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="vendorName"
                      {...register('vendorName')}
                      placeholder="Enter your business name"
                      className={errors.vendorName ? 'border-red-500' : ''}
                    />
                    {errors.vendorName && (
                      <p className="text-red-500 text-sm flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.vendorName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress">
                    Business Address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="businessAddress"
                    {...register('businessAddress')}
                    placeholder="Enter your complete business address"
                    rows={3}
                    className={errors.businessAddress ? 'border-red-500' : ''}
                  />
                  {errors.businessAddress && (
                    <p className="text-red-500 text-sm flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.businessAddress.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* MSME Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  MSME Status Information
                </CardTitle>
                <CardDescription>
                  Select your current MSME certification status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Current MSME Status <span className="text-red-500">*</span></Label>
                  <Select onValueChange={(value) => setValue('msmeStatus', value as any)}>
                    <SelectTrigger className={errors.msmeStatus ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select your MSME status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MSME Certified">MSME Certified</SelectItem>
                      <SelectItem value="Non MSME">Non MSME</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.msmeStatus && (
                    <p className="text-red-500 text-sm flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.msmeStatus.message}
                    </p>
                  )}
                </div>

                {/* Conditional Fields for MSME Certified */}
                {msmeStatus === 'MSME Certified' && (
                  <div className="space-y-6 border-l-4 border-green-500 pl-6 bg-green-50 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-green-800 mb-4">MSME Certification Details</h4>
                    
                    <div className="space-y-2">
                      <Label>MSME Category <span className="text-red-500">*</span></Label>
                      <Select onValueChange={(value) => setValue('msmeCategory', value as any)}>
                        <SelectTrigger className={errors.msmeCategory ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select your enterprise category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Micro Enterprise">Micro Enterprise</SelectItem>
                          <SelectItem value="Small Enterprise">Small Enterprise</SelectItem>
                          <SelectItem value="Medium Enterprise">Medium Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.msmeCategory && (
                        <p className="text-red-500 text-sm flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.msmeCategory.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="udyamNumber">
                        Udyam Registration Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="udyamNumber"
                        {...register('udyamNumber')}
                        placeholder="UDYAM-XX-XX-XXXXXXX"
                        className={errors.udyamNumber ? 'border-red-500' : ''}
                      />
                      <p className="text-sm text-gray-600">
                        Format: UDYAM-[State Code]-[Year]-[7 digits]
                      </p>
                      {errors.udyamNumber && (
                        <p className="text-red-500 text-sm flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.udyamNumber.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="certificate">Certificate Upload (Optional)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <input
                          type="file"
                          id="certificate"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="certificate"
                          className="cursor-pointer text-sm text-gray-600"
                        >
                          Click to upload your MSME certificate
                          <br />
                          <span className="text-xs text-gray-500">
                            Supports PDF, PNG, JPG (Max 10MB)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Fields for Non MSME */}
                {msmeStatus === 'Non MSME' && (
                  <div className="space-y-4 border-l-4 border-orange-500 pl-6 bg-orange-50 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-orange-800 mb-4">Declaration</h4>
                    <p className="text-sm text-gray-700 mb-4">
                      By checking this box, you confirm that your organization does not qualify for MSME certification.
                    </p>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="declaration"
                        checked={watch('nonMsmeDeclaration')}
                        onCheckedChange={(checked) => setValue('nonMsmeDeclaration', checked as boolean)}
                        className={errors.nonMsmeDeclaration ? 'border-red-500' : ''}
                      />
                      <Label htmlFor="declaration" className="text-sm leading-relaxed">
                        I confirm that our organization does not qualify for MSME certification.
                        <span className="text-red-500"> *</span>
                      </Label>
                    </div>
                    {errors.nonMsmeDeclaration && (
                      <p className="text-red-500 text-sm flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.nonMsmeDeclaration.message}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Bar */}
            {isSubmitting && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Submitting your information...</span>
                      <span className="text-sm text-gray-600">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full md:w-auto px-8 py-3 text-lg"
              >
                {isSubmitting ? 'Submitting...' : 'Submit MSME Status Update'}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            © 2024 Ministry of Micro, Small and Medium Enterprises, Government of India
          </p>
          <p className="text-xs text-gray-500 mt-1">
            For technical support, contact: support@msme.gov.in
          </p>
        </div>
      </div>
    </div>
  );
}