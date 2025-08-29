-- Idempotent schema initialization for MSME Campaign Central
-- Safe to run on a fresh project; existing objects are skipped.
-- NOTE: If you already applied earlier granular migrations, this file will effectively no-op.

-- Enums --------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.campaign_status AS ENUM ('Draft','Active','Completed','Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.msme_category AS ENUM ('Micro','Small','Medium','Others');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.msme_status AS ENUM (
        'MSME Certified','Non MSME','MSME Application Pending','Others','MSME'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.response_status AS ENUM ('Pending','Completed','Partial','Failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name text NOT NULL,
    vendor_code text NOT NULL UNIQUE,
    email text,
    phone text,
    msme_status public.msme_status,
    msme_category public.msme_category,
    business_category text,
    group_category text,
    location text,
    registration_date date,
    udyam_number text,
    opening_balance numeric,
    credit_amount numeric,
    debit_amount numeric,
    closing_balance numeric,
    last_updated_date timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_forms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    settings jsonb,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_fields (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id uuid NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
    field_name text NOT NULL,
    label text NOT NULL,
    field_type text NOT NULL,
    order_index int NOT NULL DEFAULT 0,
    is_required boolean DEFAULT false,
    options jsonb,
    validation_rules jsonb,
    conditional_logic jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    variables text[],
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    content text NOT NULL,
    variables text[],
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.msme_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    status public.campaign_status DEFAULT 'Draft',
    communication_only boolean DEFAULT false,
    email_template_id uuid REFERENCES public.email_templates(id),
    whatsapp_template_id uuid REFERENCES public.whatsapp_templates(id),
    form_id uuid REFERENCES public.custom_forms(id),
    target_vendors text[],
    deadline timestamptz,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.msme_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid REFERENCES public.msme_campaigns(id) ON DELETE SET NULL,
    vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
    form_data jsonb,
    response_status public.response_status DEFAULT 'Pending',
    submitted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id uuid NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
    vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
    campaign_id uuid REFERENCES public.msme_campaigns(id) ON DELETE SET NULL,
    response_data jsonb,
    ip_address text,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_uploads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid REFERENCES public.msme_campaigns(id) ON DELETE SET NULL,
    vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text NOT NULL,
    file_size bigint,
    uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_email_sends (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.msme_campaigns(id) ON DELETE CASCADE,
    vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    email_type text NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.upload_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_session_id text NOT NULL DEFAULT gen_random_uuid()::text,
    error_type text NOT NULL,
    error_details text,
    raw_data jsonb,
    vendor_name text,
    vendor_code text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY, -- matches auth.users.id
    full_name text,
    role text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vendors_code ON public.vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_campaign_status ON public.msme_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_msme_responses_vendor ON public.msme_responses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_msme_responses_campaign ON public.msme_responses(campaign_id);

-- Seeds (only insert if table empty) ---------------------------------------
INSERT INTO public.vendors (vendor_name, vendor_code, email, msme_status, msme_category)
SELECT 'Sample Vendor','VENDOR001','sample.vendor@example.com','MSME Certified','Small'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE vendor_code = 'VENDOR001');

INSERT INTO public.email_templates (name, subject, body)
SELECT 'Welcome MSME','Welcome to MSME Compliance','<p>Hello {{vendor_name}}, welcome!</p>'
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE name = 'Welcome MSME');

INSERT INTO public.whatsapp_templates (name, content)
SELECT 'Reminder','Hello {{vendor_name}}, please update your MSME status.'
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_templates WHERE name = 'Reminder');

-- Done ---------------------------------------------------------------------
