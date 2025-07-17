import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

interface Campaign {
  id: string;
  name: string;
  whatsapp_content: string;
  whatsapp_variables: string[];
}

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
  phone: string;
  location: string;
}

const formatPhoneNumber = (phone: string): string => {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If the number doesn't start with country code, assume India (+91)
  if (cleaned.length === 10) {
    return '+91' + cleaned;
  }
  
  // If it already has country code but no +, add it
  if (cleaned.length > 10 && !cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
};

export const sendCampaignWhatsApp = async (campaign: Campaign, vendor: Vendor) => {
  if (!vendor.phone) {
    throw new Error('Vendor phone number not provided');
  }

  // Replace variables in WhatsApp content
  let content = campaign.whatsapp_content;

  const replacements = {
    '{vendor_name}': vendor.vendor_name,
    '{vendor_code}': vendor.vendor_code,
    '{location}': vendor.location || 'N/A'
  };

  Object.entries(replacements).forEach(([key, value]) => {
    content = content.replace(new RegExp(key, 'g'), value);
  });

  const formattedPhone = formatPhoneNumber(vendor.phone);

  const result = await client.messages.create({
    body: content,
    from: 'whatsapp:+14155238886', // Twilio sandbox number
    to: `whatsapp:${formattedPhone}`,
  });

  return result;
};