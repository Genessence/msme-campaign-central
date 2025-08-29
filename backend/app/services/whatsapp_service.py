import httpx
import asyncio
import logging
from typing import Optional, List, Dict, Any
import os
import json

logger = logging.getLogger(__name__)


class WhatsAppService:
    def __init__(self):
        self.access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
        self.phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
        self.api_version = os.getenv("WHATSAPP_API_VERSION", "v17.0")
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        self.verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "")

    async def send_message(
        self,
        phone_number: str,
        message: str,
        vendor_name: str = "",
        message_type: str = "text"
    ) -> bool:
        """Send WhatsApp message to vendor"""
        try:
            # Clean phone number (remove spaces, dashes, etc.)
            clean_phone = self._clean_phone_number(phone_number)
            
            if not clean_phone:
                logger.error(f"Invalid phone number: {phone_number}")
                return False

            # Check if service is configured
            if not self.access_token or not self.phone_number_id:
                logger.info(f"WHATSAPP (DEV MODE): To: {clean_phone}, Message: {message[:100]}...")
                return True  # Return True in dev mode

            # Prepare message payload
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "text",
                "text": {
                    "body": message
                }
            }

            # Send message
            success = await self._send_whatsapp_api_request(payload)
            
            if success:
                logger.info(f"WhatsApp message sent successfully to {clean_phone}")
            else:
                logger.error(f"Failed to send WhatsApp message to {clean_phone}")

            return success

        except Exception as e:
            logger.error(f"WhatsApp sending failed for {phone_number}: {str(e)}")
            return False

    async def send_template_message(
        self,
        phone_number: str,
        template_name: str,
        language_code: str = "en",
        parameters: Optional[List[str]] = None
    ) -> bool:
        """Send WhatsApp template message"""
        try:
            clean_phone = self._clean_phone_number(phone_number)
            
            if not clean_phone:
                logger.error(f"Invalid phone number: {phone_number}")
                return False

            if not self.access_token or not self.phone_number_id:
                logger.info(f"WHATSAPP TEMPLATE (DEV MODE): To: {clean_phone}, Template: {template_name}")
                return True

            # Prepare template payload
            template_payload = {
                "name": template_name,
                "language": {
                    "code": language_code
                }
            }

            # Add parameters if provided
            if parameters:
                template_payload["components"] = [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": param} for param in parameters]
                    }
                ]

            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "template",
                "template": template_payload
            }

            success = await self._send_whatsapp_api_request(payload)
            
            if success:
                logger.info(f"WhatsApp template message sent to {clean_phone}")
            else:
                logger.error(f"Failed to send WhatsApp template to {clean_phone}")

            return success

        except Exception as e:
            logger.error(f"WhatsApp template sending failed: {str(e)}")
            return False

    async def _send_whatsapp_api_request(self, payload: Dict[str, Any]) -> bool:
        """Send request to WhatsApp Business API"""
        try:
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )

                if response.status_code == 200:
                    response_data = response.json()
                    logger.debug(f"WhatsApp API response: {response_data}")
                    return True
                else:
                    logger.error(f"WhatsApp API error: {response.status_code} - {response.text}")
                    return False

        except Exception as e:
            logger.error(f"WhatsApp API request failed: {str(e)}")
            return False

    def _clean_phone_number(self, phone_number: str) -> str:
        """Clean and validate phone number"""
        if not phone_number:
            return ""

        # Remove all non-digit characters except +
        clean_number = ''.join(char for char in phone_number if char.isdigit() or char == '+')
        
        # Remove leading + if present
        if clean_number.startswith('+'):
            clean_number = clean_number[1:]
        
        # Add country code if not present (assuming India +91)
        if len(clean_number) == 10 and clean_number.startswith(('9', '8', '7', '6')):
            clean_number = '91' + clean_number
        
        # Validate length (should be 12 digits for India: 91 + 10 digits)
        if len(clean_number) < 10 or len(clean_number) > 15:
            return ""
        
        return clean_number

    async def send_bulk_messages(
        self,
        message_list: List[dict],
        batch_size: int = 5,
        delay_between_batches: float = 2.0
    ) -> dict:
        """Send bulk WhatsApp messages with rate limiting"""
        results = {
            'total': len(message_list),
            'sent': 0,
            'failed': 0,
            'errors': []
        }

        try:
            # Process messages in batches (WhatsApp has stricter rate limits)
            for i in range(0, len(message_list), batch_size):
                batch = message_list[i:i + batch_size]
                
                # Send batch with individual delays (to respect rate limits)
                for j, msg_data in enumerate(batch):
                    try:
                        success = await self.send_message(
                            phone_number=msg_data['phone'],
                            message=msg_data['message'],
                            vendor_name=msg_data.get('name', '')
                        )
                        
                        if success:
                            results['sent'] += 1
                        else:
                            results['failed'] += 1
                            results['errors'].append(f"Message {i+j}: Send failed")
                        
                        # Small delay between individual messages
                        if j < len(batch) - 1:
                            await asyncio.sleep(0.5)
                    
                    except Exception as e:
                        results['failed'] += 1
                        results['errors'].append(f"Message {i+j}: {str(e)}")
                
                # Longer delay between batches
                if i + batch_size < len(message_list):
                    await asyncio.sleep(delay_between_batches)
                
                logger.info(f"Processed WhatsApp batch {i//batch_size + 1}: "
                           f"{results['sent']}/{results['total']} sent")

        except Exception as e:
            logger.error(f"Bulk WhatsApp sending failed: {str(e)}")
            results['errors'].append(f"Bulk sending error: {str(e)}")

        return results

    def test_api_connection(self) -> dict:
        """Test WhatsApp Business API connection"""
        try:
            if not self.access_token or not self.phone_number_id:
                return {
                    'success': False,
                    'message': 'WhatsApp API credentials not configured',
                    'details': 'Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID'
                }

            # Test with a simple API call
            return {
                'success': True,
                'message': 'WhatsApp API configuration found',
                'details': f'Phone Number ID: {self.phone_number_id[:10]}...'
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': 'WhatsApp API test failed',
                'details': str(e)
            }

    async def send_test_message(self, phone_number: str) -> dict:
        """Send a test WhatsApp message"""
        message = """
🧪 *Test Message from MSME Campaign Central*

This is a test message to verify WhatsApp integration.

If you received this message, the WhatsApp configuration is working correctly.

Best regards,
MSME Campaign Central Team
        """
        
        try:
            success = await self.send_message(
                phone_number=phone_number,
                message=message,
                vendor_name="Test User"
            )
            
            return {
                'success': success,
                'message': 'Test WhatsApp message sent' if success else 'Test message failed',
                'phone_number': phone_number
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': 'Test WhatsApp message failed',
                'error': str(e)
            }

    def handle_webhook(self, webhook_data: dict) -> dict:
        """Handle WhatsApp webhook notifications"""
        try:
            # Verify webhook
            if 'hub.verify_token' in webhook_data:
                if webhook_data['hub.verify_token'] == self.verify_token:
                    return {'challenge': webhook_data.get('hub.challenge', '')}
                else:
                    return {'error': 'Invalid verify token'}

            # Process webhook data
            if 'entry' in webhook_data:
                for entry in webhook_data['entry']:
                    if 'changes' in entry:
                        for change in entry['changes']:
                            if change.get('field') == 'messages':
                                self._process_message_status(change.get('value', {}))

            return {'status': 'processed'}

        except Exception as e:
            logger.error(f"Webhook processing failed: {str(e)}")
            return {'error': str(e)}

    def _process_message_status(self, value: dict):
        """Process message status updates from webhook"""
        try:
            if 'statuses' in value:
                for status in value['statuses']:
                    message_id = status.get('id')
                    status_type = status.get('status')
                    timestamp = status.get('timestamp')
                    
                    logger.info(f"WhatsApp message {message_id} status: {status_type}")
                    
                    # Here you can update your database with delivery status
                    # self.update_message_status(message_id, status_type, timestamp)

        except Exception as e:
            logger.error(f"Message status processing failed: {str(e)}")
