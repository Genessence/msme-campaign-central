import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle } from 'lucide-react';
import { CampaignBasicInfo } from '@/components/campaign-wizard/CampaignBasicInfo';
import { VendorSelection } from '@/components/campaign-wizard/VendorSelection';
import { TemplateSelection } from '@/components/campaign-wizard/TemplateSelection';
import { CampaignReview } from '@/components/campaign-wizard/CampaignReview';
import { useToast } from '@/hooks/use-toast';

export interface CampaignFormData {
  name: string;
  description: string;
  deadline: string;
  selectedVendors: string[];
  emailTemplateId?: string;
  whatsappTemplateId?: string;
}

const steps = [
  { id: 1, title: 'Basic Information', description: 'Campaign details' },
  { id: 2, title: 'Target Vendors', description: 'Select vendors' },
  { id: 3, title: 'Templates', description: 'Choose templates' },
  { id: 4, title: 'Review & Launch', description: 'Final review' },
];

export default function CreateCampaign() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    deadline: '',
    selectedVendors: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const updateFormData = (data: Partial<CampaignFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    setIsSubmitting(true);
    try {
      // Implementation for campaign creation will be added here
      toast({
        title: "Campaign Created",
        description: `Campaign "${formData.name}" has been ${isDraft ? 'saved as draft' : 'launched'} successfully.`,
      });
      navigate('/campaigns');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CampaignBasicInfo
            data={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <VendorSelection
            data={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <TemplateSelection
            data={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 4:
        return (
          <CampaignReview
            data={formData}
            onSubmit={handleSubmit}
            onPrev={prevStep}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
          <p className="text-muted-foreground">
            Create a new MSME status update campaign
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/campaigns')}
        >
          Cancel
        </Button>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Step {currentStep} of {steps.length}</CardTitle>
              <CardDescription>{steps[currentStep - 1].description}</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round(progress)}% Complete
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
      </Card>

      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 mb-2">
                {currentStep > step.id ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : currentStep === step.id ? (
                  <div className="w-3 h-3 rounded-full bg-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <div className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-px w-16 mx-4 ${
                currentStep > step.id ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-96">
        {renderStep()}
      </div>
    </div>
  );
}