-- Create users table (replacing auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create msme_campaigns table
CREATE TABLE msme_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  status campaign_status DEFAULT 'Draft',
  target_vendors UUID[] DEFAULT '{}',
  email_template_id UUID,
  whatsapp_template_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email_templates table
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create whatsapp_templates table
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create vendors table
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code TEXT NOT NULL UNIQUE,
  vendor_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  business_category TEXT,
  group_category TEXT,
  msme_category msme_category,
  msme_status msme_status DEFAULT 'Others',
  registration_date DATE,
  opening_balance NUMERIC,
  closing_balance NUMERIC,
  credit_amount NUMERIC,
  debit_amount NUMERIC,
  udyam_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated_date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create msme_responses table
CREATE TABLE msme_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES msme_campaigns(id),
  vendor_id UUID REFERENCES vendors(id),
  response_status response_status DEFAULT 'Pending',
  form_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE
);

-- Create campaign_email_sends table
CREATE TABLE campaign_email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES msme_campaigns(id) NOT NULL,
  vendor_id UUID REFERENCES vendors(id) NOT NULL,
  email_type TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create document_uploads table
CREATE TABLE document_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES msme_campaigns(id),
  vendor_id UUID REFERENCES vendors(id),
  file_type TEXT NOT NULL,
  file_size BIGINT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create upload_logs table
CREATE TABLE upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_session_id UUID DEFAULT gen_random_uuid(),
  vendor_name TEXT,
  vendor_code TEXT,
  error_type TEXT NOT NULL,
  error_details TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_vendors_msme_status ON vendors(msme_status);
CREATE INDEX idx_msme_responses_campaign_id ON msme_responses(campaign_id);
CREATE INDEX idx_msme_responses_vendor_id ON msme_responses(vendor_id);
CREATE INDEX idx_campaign_email_sends_campaign_id ON campaign_email_sends(campaign_id);
CREATE INDEX idx_document_uploads_campaign_id ON document_uploads(campaign_id);
CREATE INDEX idx_document_uploads_vendor_id ON document_uploads(vendor_id);