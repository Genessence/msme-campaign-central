-- Create custom_forms table
CREATE TABLE public.custom_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create form_fields table
CREATE TABLE public.form_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  field_type text NOT NULL,
  field_name text NOT NULL,
  label text NOT NULL,
  validation_rules jsonb DEFAULT '{}'::jsonb,
  options jsonb DEFAULT '{}'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  is_required boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create form_responses table
CREATE TABLE public.form_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.msme_campaigns(id),
  vendor_id uuid REFERENCES public.vendors(id),
  response_data jsonb DEFAULT '{}'::jsonb,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add new fields to msme_campaigns table
ALTER TABLE public.msme_campaigns 
ADD COLUMN form_id uuid REFERENCES public.custom_forms(id),
ADD COLUMN communication_only boolean DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for custom_forms
CREATE POLICY "Allow authenticated users to manage custom forms" 
ON public.custom_forms 
FOR ALL 
TO authenticated 
USING (true);

CREATE POLICY "Allow public read access to active forms" 
ON public.custom_forms 
FOR SELECT 
USING (is_active = true);

-- Create RLS policies for form_fields
CREATE POLICY "Allow authenticated users to manage form fields" 
ON public.form_fields 
FOR ALL 
TO authenticated 
USING (true);

CREATE POLICY "Allow public read access to form fields" 
ON public.form_fields 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.custom_forms 
  WHERE id = form_fields.form_id AND is_active = true
));

-- Create RLS policies for form_responses
CREATE POLICY "Allow authenticated users to manage form responses" 
ON public.form_responses 
FOR ALL 
TO authenticated 
USING (true);

CREATE POLICY "Allow public insert on form responses" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_custom_forms_slug ON public.custom_forms(slug);
CREATE INDEX idx_form_fields_form_id ON public.form_fields(form_id);
CREATE INDEX idx_form_fields_order ON public.form_fields(form_id, order_index);
CREATE INDEX idx_form_responses_form_id ON public.form_responses(form_id);
CREATE INDEX idx_form_responses_campaign_id ON public.form_responses(campaign_id);

-- Create trigger for updating updated_at on custom_forms
CREATE TRIGGER update_custom_forms_updated_at
BEFORE UPDATE ON public.custom_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();