import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCampaignWhatsAppRequest {
  campaignId: string;
  vendorId: string;
  vendorPhone: string;
  vendorName: string;
  templateId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { campaignId, vendorId, vendorPhone, vendorName, templateId }: SendCampaignWhatsAppRequest = await req.json();

    console.log('Sending campaign WhatsApp:', { campaignId, vendorId, vendorPhone, templateId });

    // Get WhatsApp template
    const { data: template, error: templateError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('WhatsApp template not found');
    }

    // Replace variables in template
    let messageContent = template.content;
    
    if (template.variables && template.variables.includes('vendor_name')) {
      messageContent = messageContent.replace(/{vendor_name}/g, vendorName);
    }

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('From', 'whatsapp:+14155238886'); // Twilio Sandbox number
    formData.append('To', `whatsapp:${vendorPhone}`);
    formData.append('Body', messageContent);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      throw new Error(`Twilio error: ${twilioData.message}`);
    }

    console.log("WhatsApp message sent successfully:", twilioData);

    // Update response status
    await supabase
      .from('msme_responses')
      .upsert({
        campaign_id: campaignId,
        vendor_id: vendorId,
        response_status: 'Pending',
        form_data: {}
      });

    return new Response(JSON.stringify({ success: true, messageSid: twilioData.sid }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-campaign-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);