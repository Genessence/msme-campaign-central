import re
from typing import Dict, Any
from jinja2 import Template, Environment, BaseLoader

from app.models.vendor import Vendor


class TemplateService:
    def __init__(self):
        self.env = Environment(loader=BaseLoader())

    def render_template(self, template_content: str, vendor: Vendor, variables: Dict[str, Any] = None) -> str:
        """Render template with vendor data and custom variables"""
        try:
            # Prepare template variables
            template_vars = self._get_vendor_variables(vendor)
            
            if variables:
                template_vars.update(variables)
            
            # Create Jinja2 template
            template = self.env.from_string(template_content)
            
            # Render template
            rendered = template.render(**template_vars)
            
            return rendered
            
        except Exception as e:
            # Fallback to simple string replacement if Jinja2 fails
            return self._simple_template_render(template_content, vendor, variables)

    def _get_vendor_variables(self, vendor: Vendor) -> Dict[str, Any]:
        """Extract vendor data as template variables"""
        return {
            'vendor_name': vendor.name or '',
            'company_name': vendor.company_name or '',
            'email': vendor.email or '',
            'phone': vendor.phone or '',
            'whatsapp': vendor.whatsapp or '',
            'address': vendor.address or '',
            'city': vendor.city or '',
            'state': vendor.state or '',
            'pincode': vendor.pincode or '',
            'industry_type': vendor.industry_type or '',
            'business_type': vendor.business_type or '',
            'business_size': vendor.business_size or '',
            'registration_number': vendor.registration_number or '',
            'gst_number': vendor.gst_number or '',
            'annual_turnover': vendor.annual_turnover or 0,
            'employee_count': vendor.employee_count or 0,
            'establishment_year': vendor.establishment_year or '',
            'website': vendor.website or '',
            'contact_person': vendor.contact_person or '',
            'designation': vendor.designation or ''
        }

    def _simple_template_render(self, template_content: str, vendor: Vendor, variables: Dict[str, Any] = None) -> str:
        """Simple template rendering using string replacement"""
        rendered = template_content
        
        # Vendor variable replacements
        vendor_vars = self._get_vendor_variables(vendor)
        for key, value in vendor_vars.items():
            rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
            rendered = rendered.replace(f"{{{key}}}", str(value))
        
        # Custom variable replacements
        if variables:
            for key, value in variables.items():
                rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
                rendered = rendered.replace(f"{{{key}}}", str(value))
        
        return rendered

    def extract_variables(self, template_content: str) -> list:
        """Extract all template variables from content"""
        # Find Jinja2 style variables {{ variable }}
        jinja_vars = re.findall(r'\{\{\s*([^}]+)\s*\}\}', template_content)
        
        # Find simple style variables {variable}
        simple_vars = re.findall(r'\{([^{}]+)\}', template_content)
        
        # Combine and clean up
        all_vars = set(jinja_vars + simple_vars)
        
        # Filter out Jinja2 expressions (keep only simple variable names)
        variables = []
        for var in all_vars:
            var = var.strip()
            if ' ' not in var and '|' not in var and '(' not in var:
                variables.append(var)
        
        return sorted(list(set(variables)))

    def validate_template(self, template_content: str) -> Dict[str, Any]:
        """Validate template syntax and return validation result"""
        try:
            # Try to parse as Jinja2 template
            template = self.env.from_string(template_content)
            
            # Extract variables
            variables = self.extract_variables(template_content)
            
            return {
                'valid': True,
                'variables': variables,
                'error': None
            }
            
        except Exception as e:
            return {
                'valid': False,
                'variables': [],
                'error': str(e)
            }

    def preview_template(self, template_content: str, vendor: Vendor = None, variables: Dict[str, Any] = None) -> Dict[str, Any]:
        """Preview template with sample or real data"""
        if vendor is None:
            # Use sample vendor data
            vendor = self._get_sample_vendor()
        
        if variables is None:
            variables = {}
        
        try:
            rendered = self.render_template(template_content, vendor, variables)
            variables_used = self.extract_variables(template_content)
            
            return {
                'rendered_content': rendered,
                'variables_used': variables_used,
                'success': True,
                'error': None
            }
            
        except Exception as e:
            return {
                'rendered_content': template_content,
                'variables_used': [],
                'success': False,
                'error': str(e)
            }

    def _get_sample_vendor(self) -> Vendor:
        """Create a sample vendor for template preview"""
        # This is a mock vendor object for preview purposes
        class MockVendor:
            def __init__(self):
                self.name = "John Doe"
                self.company_name = "Sample Industries Pvt Ltd"
                self.email = "john.doe@sample.com"
                self.phone = "+91-9876543210"
                self.whatsapp = "+91-9876543210"
                self.address = "123 Business Street, Industrial Area"
                self.city = "Mumbai"
                self.state = "Maharashtra"
                self.pincode = "400001"
                self.industry_type = "Manufacturing"
                self.business_type = "Private Limited"
                self.business_size = "Medium"
                self.registration_number = "U12345MH2020PTC123456"
                self.gst_number = "27ABCDE1234F1Z5"
                self.annual_turnover = 50000000
                self.employee_count = 150
                self.establishment_year = "2020"
                self.website = "https://sample.com"
                self.contact_person = "John Doe"
                self.designation = "Managing Director"
        
        return MockVendor()
