import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import asyncio
import logging
from typing import Optional, List
import os
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME or ""
        self.smtp_password = settings.SMTP_PASSWORD or ""
        self.from_email = settings.SMTP_USERNAME if settings.SMTP_USERNAME else settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        vendor_name: str = "",
        html_body: Optional[str] = None,
        attachments: Optional[List[str]] = None
    ) -> bool:
        """Send email to vendor"""
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Add text part
            text_part = MIMEText(body, "plain")
            message.attach(text_part)

            # Add HTML part if provided
            if html_body:
                html_part = MIMEText(html_body, "html")
                message.attach(html_part)

            # Add attachments if provided
            if attachments:
                for file_path in attachments:
                    if os.path.exists(file_path):
                        self._add_attachment(message, file_path)

            # Send email
            if self.smtp_username and self.smtp_password:
                success = await self._send_smtp_email(message, to_email)
            else:
                # Log email instead of sending (for development)
                logger.info(f"EMAIL (DEV MODE): To: {to_email}, Subject: {subject}")
                logger.info(f"Body: {body[:200]}...")
                success = True

            if success:
                logger.info(f"Email sent successfully to {to_email}")
            else:
                logger.error(f"Failed to send email to {to_email}")

            return success

        except Exception as e:
            logger.error(f"Email sending failed for {to_email}: {str(e)}")
            return False

    async def _send_smtp_email(self, message: MIMEMultipart, to_email: str) -> bool:
        """Send email via SMTP"""
        try:
            # Create secure connection
            context = ssl.create_default_context()
            
            # Handle different ports: 465 (SSL) vs 587 (STARTTLS)
            if self.smtp_port == 465:
                # Port 465 uses SSL from the start
                with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context) as server:
                    server.login(self.smtp_username, self.smtp_password)
                    text = message.as_string()
                    server.sendmail(self.from_email, to_email, text)
            else:
                # Port 587 uses STARTTLS
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls(context=context)
                    server.login(self.smtp_username, self.smtp_password)
                    text = message.as_string()
                    server.sendmail(self.from_email, to_email, text)
            
            return True
            
        except Exception as e:
            logger.error(f"SMTP sending failed: {str(e)}")
            return False

    def _add_attachment(self, message: MIMEMultipart, file_path: str):
        """Add file attachment to email"""
        try:
            with open(file_path, "rb") as attachment:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment.read())

            encoders.encode_base64(part)

            filename = Path(file_path).name
            part.add_header(
                'Content-Disposition',
                f'attachment; filename= {filename}',
            )

            message.attach(part)
            logger.info(f"Added attachment: {filename}")

        except Exception as e:
            logger.error(f"Failed to add attachment {file_path}: {str(e)}")

    async def send_bulk_emails(
        self,
        email_list: List[dict],
        subject_template: str,
        body_template: str,
        batch_size: int = 100,
        delay_between_batches: float = 2.0
    ) -> dict:
        """Send bulk emails with rate limiting"""
        results = {
            'total': len(email_list),
            'sent': 0,
            'failed': 0,
            'errors': [],
            'batches_processed': 0,
            'batch_size': batch_size
        }

        try:
            logger.info(f"Starting bulk email send for {len(email_list)} emails in batches of {batch_size}")
            
            # Process emails in batches
            for i in range(0, len(email_list), batch_size):
                batch_number = i // batch_size + 1
                batch = email_list[i:i + batch_size]
                
                logger.info(f"Processing batch {batch_number}: emails {i+1} to {min(i+batch_size, len(email_list))}")
                
                # Send batch concurrently with smaller sub-batches to avoid overwhelming SMTP
                sub_batch_size = 10  # Send 10 emails concurrently within each batch
                batch_sent = 0
                batch_failed = 0
                
                for j in range(0, len(batch), sub_batch_size):
                    sub_batch = batch[j:j + sub_batch_size]
                    
                    # Send sub-batch concurrently
                    tasks = []
                    for email_data in sub_batch:
                        task = self.send_email(
                            to_email=email_data['email'],
                            subject=subject_template.format(**email_data),
                            body=body_template.format(**email_data),
                            vendor_name=email_data.get('name', '')
                        )
                        tasks.append(task)
                    
                    # Wait for sub-batch to complete
                    sub_batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    # Process sub-batch results
                    for k, result in enumerate(sub_batch_results):
                        email_index = i + j + k
                        if isinstance(result, Exception):
                            batch_failed += 1
                            results['failed'] += 1
                            error_msg = f"Email {email_index + 1} ({sub_batch[k]['email']}): {str(result)}"
                            results['errors'].append(error_msg)
                            logger.error(error_msg)
                        elif result:
                            batch_sent += 1
                            results['sent'] += 1
                            logger.info(f"Email {email_index + 1} sent successfully to {sub_batch[k]['email']}")
                        else:
                            batch_failed += 1
                            results['failed'] += 1
                            error_msg = f"Email {email_index + 1} ({sub_batch[k]['email']}): Unknown error"
                            results['errors'].append(error_msg)
                            logger.error(error_msg)
                    
                    # Small delay between sub-batches to avoid rate limiting
                    if j + sub_batch_size < len(batch):
                        await asyncio.sleep(0.5)
                
                results['batches_processed'] += 1
                logger.info(f"Batch {batch_number} completed: {batch_sent} sent, {batch_failed} failed")
                
                # Delay between main batches
                if i + batch_size < len(email_list):
                    logger.info(f"Waiting {delay_between_batches} seconds before next batch...")
                    await asyncio.sleep(delay_between_batches)
                
                logger.info(f"Progress: {results['sent']}/{results['total']} emails sent ({results['batches_processed']} batches)")

            logger.info(f"Bulk email send completed: {results['sent']} sent, {results['failed']} failed")
            
        except Exception as e:
            logger.error(f"Bulk email sending failed: {str(e)}")
            results['errors'].append(f"Bulk sending error: {str(e)}")

        return results

    def test_smtp_connection(self) -> dict:
        """Test SMTP connection and authentication"""
        try:
            if not self.smtp_username or not self.smtp_password:
                return {
                    'success': False,
                    'message': 'SMTP credentials not configured',
                    'details': 'Set SMTP_USERNAME and SMTP_PASSWORD environment variables'
                }

            context = ssl.create_default_context()
            
            # Handle different ports: 465 (SSL) vs 587 (STARTTLS)
            if self.smtp_port == 465:
                # Port 465 uses SSL from the start
                with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context) as server:
                    server.login(self.smtp_username, self.smtp_password)
            else:
                # Port 587 uses STARTTLS
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls(context=context)
                    server.login(self.smtp_username, self.smtp_password)
            
            return {
                'success': True,
                'message': 'SMTP connection successful',
                'details': f'Connected to {self.smtp_server}:{self.smtp_port}'
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': 'SMTP connection failed',
                'details': str(e)
            }

    async def send_test_email(self, to_email: str) -> dict:
        """Send a test email to verify configuration"""
        subject = "Test Email from MSME Campaign Central"
        body = """
This is a test email from MSME Campaign Central.

If you received this email, the email configuration is working correctly.

Best regards,
MSME Campaign Central Team
        """
        
        try:
            success = await self.send_email(
                to_email=to_email,
                subject=subject,
                body=body,
                vendor_name="Test User"
            )
            
            return {
                'success': success,
                'message': 'Test email sent' if success else 'Test email failed',
                'to_email': to_email
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': 'Test email failed',
                'error': str(e)
            }
