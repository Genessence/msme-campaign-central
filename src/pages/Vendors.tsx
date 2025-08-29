import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VendorUpload } from "@/components/VendorUpload";
import fastApiClient from "@/lib/fastapi-client";
import { useAuth } from "@/hooks/useAuth";

interface Vendor {
  id: string;
  company_name: string;
  vendor_code: string;
  contact_person_name?: string;
  email?: string;
  phone_number?: string;
  registered_address?: string;
  country_origin?: string;
  supplier_type?: string;
  supplier_category?: string;
  annual_turnover?: number;
  year_established?: number;
  msme_status?: string;
  msme_category?: string;
  pan_number?: string;
  gst_number?: string;
  currency?: string;
  nda?: boolean;
  sqa?: boolean;
  four_m?: boolean;
  code_of_conduct?: boolean;
  compliance_agreement?: boolean;
  self_declaration?: boolean;
  created_at: string;
}

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Filter vendors based on search term
  const filteredVendors = useMemo(() => {
    if (!searchTerm.trim()) return vendors;
    
    return vendors.filter(vendor => 
      vendor.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.vendor_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.supplier_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_person_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const vendorData = await fastApiClient.vendors.getAll(0, 1000);
      console.log('Fetched vendors:', vendorData);
      setVendors(Array.isArray(vendorData) ? vendorData : []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast({
        title: "Error",
        description: "Failed to fetch vendors. Please check your connection and try again.",
        variant: "destructive",
      });
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchVendors();
    }
  }, [isAuthenticated]);

  const handleUploadComplete = () => {
    fetchVendors();
  };

  const exportToCSV = () => {
    if (vendors.length === 0) {
      toast({
        title: "No Data",
        description: "No vendors to export",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = [
      'company_name', 'vendor_code', 'contact_person_name', 'email', 'phone_number',
      'registered_address', 'country_origin', 'supplier_type', 'supplier_category',
      'annual_turnover', 'year_established', 'msme_status', 'msme_category',
      'pan_number', 'gst_number', 'currency', 'nda', 'sqa', 'four_m',
      'code_of_conduct', 'compliance_agreement', 'self_declaration'
    ];

    const csvContent = [
      csvHeaders.join(','),
      ...vendors.map(vendor => 
        csvHeaders.map(header => {
          const value = vendor[header as keyof Vendor] ?? '';
          const stringValue = String(value);
          return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vendors_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Success",
      description: "Vendors exported to CSV successfully",
    });
  };

  const downloadTemplate = () => {
    const templateHeaders = [
      'company_name', 'vendor_code', 'contact_person_name', 'email', 'phone_number',
      'registered_address', 'country_origin', 'supplier_type', 'supplier_category',
      'annual_turnover', 'year_established', 'msme_status', 'pan_number',
      'gst_number', 'currency', 'nda', 'sqa', 'four_m', 'code_of_conduct',
      'compliance_agreement', 'self_declaration'
    ];

    const templateData = [
      'Tech Solutions Pvt Ltd', 'TECH001', 'Rajesh Kumar', 'rajesh@techsolutions.com',
      '+91-9876543210', '123 Tech Park, Bangalore, Karnataka, 560001', 'India',
      'service', 'IT Services', '50000000', '2010', 'micro', 'ABCDE1234F',
      '29ABCDE1234F1Z5', 'INR', 'true', 'true', 'false', 'true', 'true', 'true'
    ];

    const csvContent = [
      templateHeaders.join(','),
      templateData.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'vendor_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Template downloaded successfully",
    });
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'micro':
        return "bg-green-100 text-green-800 border-green-200";
      case 'small':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'medium':
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatCurrency = (amount?: number, currency = 'INR') => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access the vendors page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">
            Manage your vendor database, upload new vendors, and export data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
        </div>
      </div>

      <VendorUpload onUploadComplete={handleUploadComplete} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Vendor List ({filteredVendors.length} of {vendors.length})</CardTitle>
            <CardDescription>
              All registered vendors in the system
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredVendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No vendors found matching your search.' : 'No vendors found. Upload some vendor data to get started.'}
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <ScrollArea className="h-[600px] w-full">
                <Table className="w-full">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[150px] sticky top-0 bg-background border-b">Company Name</TableHead>
                      <TableHead className="w-[100px] sticky top-0 bg-background border-b">Code</TableHead>
                      <TableHead className="w-[120px] sticky top-0 bg-background border-b">Contact Person</TableHead>
                      <TableHead className="w-[160px] sticky top-0 bg-background border-b">Email</TableHead>
                      <TableHead className="w-[120px] sticky top-0 bg-background border-b">Phone</TableHead>
                      <TableHead className="w-[100px] sticky top-0 bg-background border-b">MSME Status</TableHead>
                      <TableHead className="w-[120px] sticky top-0 bg-background border-b">Category</TableHead>
                      <TableHead className="w-[120px] sticky top-0 bg-background border-b">Annual Turnover</TableHead>
                      <TableHead className="w-[100px] sticky top-0 bg-background border-b">Compliance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium truncate max-w-[150px]" title={vendor.company_name}>
                          {vendor.company_name}
                        </TableCell>
                        <TableCell className="truncate">{vendor.vendor_code}</TableCell>
                        <TableCell className="truncate max-w-[120px]" title={vendor.contact_person_name || ""}>
                          {vendor.contact_person_name || "—"}
                        </TableCell>
                        <TableCell className="truncate max-w-[160px]" title={vendor.email || ""}>
                          {vendor.email || "—"}
                        </TableCell>
                        <TableCell className="truncate">{vendor.phone_number || "—"}</TableCell>
                        <TableCell>
                          {vendor.msme_status ? (
                            <Badge className={`${getStatusBadgeColor(vendor.msme_status)} text-xs`}>
                              {vendor.msme_status}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="truncate max-w-[120px]" title={vendor.supplier_category || ""}>
                          {vendor.supplier_category || "—"}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(vendor.annual_turnover, vendor.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {vendor.nda && <Badge variant="secondary" className="text-xs">NDA</Badge>}
                            {vendor.sqa && <Badge variant="secondary" className="text-xs">SQA</Badge>}
                            {vendor.code_of_conduct && <Badge variant="secondary" className="text-xs">CoC</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}