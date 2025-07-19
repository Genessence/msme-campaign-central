import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FormField {
  id: string;
  field_type: string;
  field_name: string;
  label: string;
  is_required: boolean;
  validation_rules: any;
  options: any;
  order_index: number;
  conditional_logic?: {
    show_when_field: string;
    show_when_value: string;
  };
}

interface CustomForm {
  id: string;
  name: string;
  title: string;
  description: string;
  slug: string;
  settings: any;
}

interface DynamicFormProps {
  form: CustomForm;
  fields: FormField[];
  onSuccess?: () => void;
  campaignId?: string;
  vendorId?: string;
}

export function DynamicForm({ form, fields, onSuccess, campaignId, vendorId }: DynamicFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const sortedFields = [...fields].sort((a, b) => a.order_index - b.order_index);
  const watchedValues = watch();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { error } = await supabase
        .from('form_responses')
        .insert({
          form_id: form.id,
          campaign_id: campaignId,
          vendor_id: vendorId,
          response_data: data,
          submitted_at: new Date().toISOString(),
        });

      if (error) throw error;

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        toast({
          title: "Success",
          description: "Form submitted successfully!",
        });

        if (onSuccess) {
          onSuccess();
        }
      }, 500);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit form",
        variant: "destructive",
      });
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if field should be shown based on conditional logic
  const shouldShowField = (field: FormField) => {
    if (!field.conditional_logic) return true;
    
    const { show_when_field, show_when_value } = field.conditional_logic;
    const watchedValue = watchedValues[show_when_field];
    return watchedValue === show_when_value;
  };

  const renderField = (field: FormField) => {
    if (!shouldShowField(field)) return null;

    const fieldProps = {
      ...register(field.field_name, {
        required: field.is_required ? `${field.label} is required` : false,
      }),
    };

    switch (field.field_type) {
      case "text":
      case "email":
      case "phone":
      case "number":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name}>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.field_name}
              type={field.field_type === "email" ? "email" : field.field_type === "number" ? "number" : "text"}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              {...fieldProps}
            />
            {errors[field.field_name] && (
              <p className="text-sm text-destructive">
                {errors[field.field_name]?.message as string}
              </p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name}>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.field_name}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              {...fieldProps}
            />
            {errors[field.field_name] && (
              <p className="text-sm text-destructive">
                {errors[field.field_name]?.message as string}
              </p>
            )}
          </div>
        );

      case "select":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select onValueChange={(value) => setValue(field.field_name, value)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string, index: number) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                )) || (
                  <>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {errors[field.field_name] && (
              <p className="text-sm text-destructive">
                {errors[field.field_name]?.message as string}
              </p>
            )}
          </div>
        );

      case "radio":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <RadioGroup onValueChange={(value) => setValue(field.field_name, value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option1" id={`${field.field_name}_option1`} />
                <Label htmlFor={`${field.field_name}_option1`}>Option 1</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option2" id={`${field.field_name}_option2`} />
                <Label htmlFor={`${field.field_name}_option2`}>Option 2</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option3" id={`${field.field_name}_option3`} />
                <Label htmlFor={`${field.field_name}_option3`}>Option 3</Label>
              </div>
            </RadioGroup>
            {errors[field.field_name] && (
              <p className="text-sm text-destructive">
                {errors[field.field_name]?.message as string}
              </p>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id={`${field.field_name}_1`} {...register(`${field.field_name}.option1`)} />
                <Label htmlFor={`${field.field_name}_1`}>Option 1</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id={`${field.field_name}_2`} {...register(`${field.field_name}.option2`)} />
                <Label htmlFor={`${field.field_name}_2`}>Option 2</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id={`${field.field_name}_3`} {...register(`${field.field_name}.option3`)} />
                <Label htmlFor={`${field.field_name}_3`}>Option 3</Label>
              </div>
            </div>
          </div>
        );

      case "date":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name}>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.field_name}
              type="date"
              {...fieldProps}
            />
            {errors[field.field_name] && (
              <p className="text-sm text-destructive">
                {errors[field.field_name]?.message as string}
              </p>
            )}
          </div>
        );

      case "file":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name}>
              {field.label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.field_name}
              type="file"
              {...fieldProps}
            />
            {errors[field.field_name] && (
              <p className="text-sm text-destructive">
                {errors[field.field_name]?.message as string}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-6 w-6 text-primary" />
                {form.title}
              </CardTitle>
              {form.description && (
                <p className="text-muted-foreground mt-2">{form.description}</p>
              )}
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {sortedFields.map(renderField)}
                
                {isSubmitting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Submitting form...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
                <div className="flex gap-4 pt-6 border-t">
                  <Button 
                    type="submit" 
                    className="flex-1 h-12 text-base font-medium" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Submitting...
                      </div>
                    ) : (
                      "Submit Form"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}