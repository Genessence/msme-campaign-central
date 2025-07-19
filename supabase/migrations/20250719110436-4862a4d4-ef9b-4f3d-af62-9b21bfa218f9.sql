-- Add conditional_logic column to form_fields table
ALTER TABLE public.form_fields 
ADD COLUMN conditional_logic JSONB;

-- Create index for better performance on conditional logic queries
CREATE INDEX idx_form_fields_conditional_logic ON public.form_fields USING GIN(conditional_logic);