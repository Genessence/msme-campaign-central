import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecuteCampaignRequest {
  campaignId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { campaignId }: ExecuteCampaignRequest = await req.json();

    console.log('Executing campaign:', campaignId);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('msme_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Get target vendors
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .in('id', campaign.target_vendors || []);

    if (vendorsError) {
      throw new Error('Failed to fetch vendors');
    }

    let emailsSent = 0;
    let whatsappSent = 0;
    const errors: string[] = [];

    // Send emails if email template is configured
    if (campaign.email_template_id && vendors) {
      for (const vendor of vendors) {
        if (vendor.email) {
          try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-campaign-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                campaignId: campaign.id,
                vendorId: vendor.id,
                vendorEmail: vendor.email,
                vendorName: vendor.vendor_name,
                vendorCode: vendor.vendor_code,
                templateId: campaign.email_template_id,
              }),
            });

            if (emailResponse.ok) {
              emailsSent++;
            } else {
              const errorData = await emailResponse.json();
              errors.push(`Email to ${vendor.vendor_name}: ${errorData.error}`);
            }
          } catch (error) {
            errors.push(`Email to ${vendor.vendor_name}: ${error}`);
          }
        }
      }
    }

    // Send WhatsApp messages if WhatsApp template is configured
    if (campaign.whatsapp_template_id && vendors) {
      for (const vendor of vendors) {
        if (vendor.phone) {
          try {
            const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-campaign-whatsapp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                campaignId: campaign.id,
                vendorId: vendor.id,
                vendorPhone: vendor.phone,
                vendorName: vendor.vendor_name,
                templateId: campaign.whatsapp_template_id,
              }),
            });

            if (whatsappResponse.ok) {
              whatsappSent++;
            } else {
              const errorData = await whatsappResponse.json();
              errors.push(`WhatsApp to ${vendor.vendor_name}: ${errorData.error}`);
            }
          } catch (error) {
            errors.push(`WhatsApp to ${vendor.vendor_name}: ${error}`);
          }
        }
      }
    }

    // Update campaign status to Active
    await supabase
      .from('msme_campaigns')
      .update({ status: 'Active' })
      .eq('id', campaignId);

    console.log(`Campaign executed: ${emailsSent} emails, ${whatsappSent} WhatsApp messages sent`);

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent, 
      whatsappSent, 
      errors: errors.length > 0 ? errors : undefined 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in execute-campaign function:", error);
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