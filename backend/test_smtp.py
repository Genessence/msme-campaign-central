#!/usr/bin/env python3
"""
Simple SMTP test script to verify email configuration
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_smtp_connection():
    """Test SMTP connection and send a test email"""
    
    # Get SMTP settings from environment
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("FROM_EMAIL", smtp_username)
    from_name = os.getenv("FROM_NAME", "MSME Campaign Central")
    
    print(f"Testing SMTP Configuration:")
    print(f"Server: {smtp_server}:{smtp_port}")
    print(f"Username: {smtp_username}")
    print(f"From Email: {from_email}")
    print(f"Password: {'*' * len(smtp_password) if smtp_password else 'NOT SET'}")
    print("-" * 50)
    
    if not smtp_username or not smtp_password:
        print("❌ ERROR: SMTP username or password not configured")
        return False
    
    try:
        # Test connection first
        print("🔗 Testing SMTP connection...")
        context = ssl.create_default_context()
        
        if smtp_port == 465:
            # SSL connection
            with smtplib.SMTP_SSL(smtp_server, smtp_port, context=context) as server:
                server.login(smtp_username, smtp_password)
                print("✅ SMTP connection successful (SSL)")
        else:
            # STARTTLS connection
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls(context=context)
                server.login(smtp_username, smtp_password)
                print("✅ SMTP connection successful (STARTTLS)")
        
        # Send test email
        test_email = input("Enter test email address (or press Enter to skip): ").strip()
        if test_email:
            print(f"📧 Sending test email to {test_email}...")
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = "SMTP Test Email"
            message["From"] = f"{from_name} <{from_email}>"
            message["To"] = test_email
            
            # Add body
            body = """
This is a test email from MSME Campaign Central.

If you received this email, your SMTP configuration is working correctly!

Test Details:
- Server: {server}:{port}
- From: {from_email}
- Authentication: Successful

Best regards,
MSME Campaign Central Team
            """.format(
                server=smtp_server,
                port=smtp_port,
                from_email=from_email
            )
            
            text_part = MIMEText(body, "plain")
            message.attach(text_part)
            
            # Send email
            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_server, smtp_port, context=context) as server:
                    server.login(smtp_username, smtp_password)
                    server.sendmail(from_email, test_email, message.as_string())
            else:
                with smtplib.SMTP(smtp_server, smtp_port) as server:
                    server.starttls(context=context)
                    server.login(smtp_username, smtp_password)
                    server.sendmail(from_email, test_email, message.as_string())
            
            print("✅ Test email sent successfully!")
        
        return True
        
    except Exception as e:
        print(f"❌ SMTP test failed: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        
        # Common error solutions
        if "Authentication failed" in str(e) or "Username and Password not accepted" in str(e):
            print("\n💡 Possible solutions:")
            print("1. Make sure you're using an App Password (not your regular password)")
            print("2. Enable 2-factor authentication and generate an App Password")
            print("3. Check if 'Less secure app access' is enabled (not recommended)")
        elif "Connection refused" in str(e):
            print("\n💡 Possible solutions:")
            print("1. Check your internet connection")
            print("2. Try a different SMTP port (587 or 465)")
            print("3. Check if your firewall is blocking the connection")
        
        return False

if __name__ == "__main__":
    test_smtp_connection()
