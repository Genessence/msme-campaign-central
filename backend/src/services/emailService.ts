import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface Campaign {
  id: string;
  name: string;
  email_subject: string;
  email_body: string;
  email_variables: string[];
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
  email: string;
  location: string;
}

export const sendCampaignEmail = async (campaign: Campaign, vendor: Vendor) => {
  if (!vendor.email) {
    throw new Error('Vendor email not provided');
  }

  // Replace variables in email body and subject
  let emailBody = campaign.email_body;
  let emailSubject = campaign.email_subject;

  const replacements = {
    '{vendor_name}': vendor.vendor_name,
    '{vendor_code}': vendor.vendor_code,
    '{location}': vendor.location || 'N/A'
  };

  Object.entries(replacements).forEach(([key, value]) => {
    emailBody = emailBody.replace(new RegExp(key, 'g'), value);
    emailSubject = emailSubject.replace(new RegExp(key, 'g'), value);
  });

  const result = await resend.emails.send({
    from: process.env.SENDER_EMAIL_ADDRESS || 'noreply@yourdomain.com',
    to: [vendor.email],
    subject: emailSubject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailBody.replace(/\n/g, '<br>')}
      </div>
    `,
  });

  if (result.error) {
    throw new Error(`Email send failed: ${result.error.message}`);
  }

  return result;
};