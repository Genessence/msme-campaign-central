import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Tables } from "@/integrations/supabase/types";

type Vendor = Tables<"vendors">;

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [vendorDocuments, setVendorDocuments] = useState<Record<string, any>>({});
  const { toast } = useToast();

  console.log("Vendors component rendering...");

  useEffect(() => {
    console.log("Vendors useEffect running...");
    fetchVendors();
  }, []);

  const fetchVendorDocuments = async () => {
    try {
      console.log("Fetching vendor documents...");
      const { data: documents, error } = await supabase
        .from('document_uploads')
        .select('*');

      if (error) throw error;

      console.log("Documents fetched:", documents);

      // Create a mapping of vendor_id to document
      const docMap: Record<string, any> = {};
      documents?.forEach(doc => {
        if (doc.vendor_id) {
          docMap[doc.vendor_id] = doc;
        }
      });

      console.log("Document mapping created:", docMap);
      setVendorDocuments(docMap);
    } catch (error) {
      console.error("Error fetching vendor documents:", error);
    }
  };

  const fetchVendors = async () => {
    console.log("Fetching vendors...");
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Vendors fetch result:", { data, error });

      if (error) throw error;
      setVendors(data || []);
      
      // Fetch vendor documents after vendors are loaded
      await fetchVendorDocuments();
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast({
        title: "Error",
        description: "Failed to fetch vendors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Utility functions for data validation and processing
  const extractValidEmails = (emailString: string): { primary: string; all: string[]; invalid: string[] } => {
    if (!emailString || typeof emailString !== 'string') {
      return { primary: "", all: [], invalid: [] };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const separators = /[,;|\s]+/;
    const emails = emailString.split(separators)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach(email => {
      if (emailRegex.test(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    });

    return {
      primary: valid[0] || "",
      all: valid,
      invalid
    };
  };

  const isValidMobileNumber = (phoneNumber: string): boolean => {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // International mobile patterns
    const mobilePatterns = [
      /^\+1[2-9]\d{9}$/,        // US/Canada mobile
      /^\+44[7-9]\d{9}$/,       // UK mobile
      /^\+91[6-9]\d{9}$/,       // India mobile
      /^\+86[1][3-9]\d{9}$/,    // China mobile
      /^\+81[7-9]\d{9}$/,       // Japan mobile
      /^\+49[1][5-7]\d{9}$/,    // Germany mobile
      /^\+33[6-7]\d{8}$/,       // France mobile
      /^\+39[3][0-9]\d{8}$/,    // Italy mobile
      /^\+61[4-5]\d{8}$/,       // Australia mobile
      /^\+55[1-9][1-9]\d{8}$/,  // Brazil mobile
      /^\+7[9]\d{9}$/,          // Russia mobile
      /^\+34[6-7]\d{8}$/,       // Spain mobile
      /^\+31[6]\d{8}$/,         // Netherlands mobile
      /^\+41[7-8]\d{8}$/,       // Switzerland mobile
      /^\+46[7]\d{8}$/,         // Sweden mobile
      /^\+47[4-9]\d{7}$/,       // Norway mobile
      /^\+45[2-9]\d{7}$/,       // Denmark mobile
      /^\+358[4-5]\d{8}$/,      // Finland mobile
      /^\+852[5-9]\d{7}$/,      // Hong Kong mobile
      /^\+65[8-9]\d{7}$/,       // Singapore mobile
      /^\+971[5]\d{8}$/,        // UAE mobile
      /^\+966[5]\d{8}$/,        // Saudi Arabia mobile
      /^\+60[1][0-9]\d{7}$/,    // Malaysia mobile
      /^\+66[8-9]\d{8}$/,       // Thailand mobile
      /^\+84[3-9]\d{8}$/,       // Vietnam mobile
      /^\+62[8]\d{8,11}$/,      // Indonesia mobile
      /^\+63[9]\d{9}$/,         // Philippines mobile
      /^\+82[1][0-9]\d{8}$/,    // South Korea mobile
      /^\+886[9]\d{8}$/,        // Taiwan mobile
      /^\+234[7-9]\d{9}$/,      // Nigeria mobile
      /^\+27[6-8]\d{8}$/,       // South Africa mobile
      /^\+20[1][0-2]\d{8}$/,    // Egypt mobile
      /^\+212[6-7]\d{8}$/,      // Morocco mobile
      /^\+54[9][1-9]\d{8}$/,    // Argentina mobile
      /^\+52[1][0-9]\d{9}$/,    // Mexico mobile
      /^\+57[3]\d{9}$/,         // Colombia mobile
      /^\+56[9]\d{8}$/,         // Chile mobile
      /^\+51[9]\d{8}$/,         // Peru mobile
    ];

    // Check if number matches any mobile pattern
    const isInternationalMobile = mobilePatterns.some(pattern => pattern.test(cleaned));
    
    // For numbers without country code, check if it's a valid local mobile
    if (!cleaned.startsWith('+') && cleaned.length >= 10 && cleaned.length <= 15) {
      // Local mobile patterns (without country code)
      const localMobilePatterns = [
        /^[6-9]\d{9}$/, // India
        /^[1-9]\d{9}$/, // Generic 10-digit starting with 1-9
        /^[4-9]\d{9}$/  // Many countries use 4-9 for mobile
      ];
      
      return localMobilePatterns.some(pattern => pattern.test(cleaned));
    }

    return isInternationalMobile;
  };

  const isLandlineNumber = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Common landline patterns
    const landlinePatterns = [
      /^\+1[2-9]\d{2}[2-9]\d{6}$/, // US landline
      /^\+44[1-2]\d{8,9}$/,        // UK landline
      /^\+91[11|22|33|44|80]\d{8}$/, // India landline (major cities)
      /^\+33[1-5]\d{8}$/,          // France landline
      /^\+49[2-9]\d{7,11}$/,       // Germany landline
      /^\+39[0][1-9]\d{8,9}$/,     // Italy landline
      /^\+81[3-6]\d{7,8}$/,        // Japan landline
      /^\+86[10|20|21|22|23|24|25|27|28|29]\d{7,8}$/, // China landline
      /^0[1-9]\d{8,10}$/,          // Generic landline starting with 0
      /^\+\d{1,3}[0-3]\d{7,10}$/,  // International landline patterns
    ];

    return landlinePatterns.some(pattern => pattern.test(cleaned));
  };

  const extractValidMobileNumbers = (phoneString: string): { primary: string; all: string[]; landlines: string[]; invalid: string[] } => {
    if (!phoneString || typeof phoneString !== 'string') {
      return { primary: "", all: [], landlines: [], invalid: [] };
    }

    const separators = /[,;|\s]+/;
    const phones = phoneString.split(separators)
      .map(phone => phone.trim())
      .filter(phone => phone.length > 0);

    const mobiles: string[] = [];
    const landlines: string[] = [];
    const invalid: string[] = [];

    phones.forEach(phone => {
      if (isValidMobileNumber(phone)) {
        mobiles.push(phone);
      } else if (isLandlineNumber(phone)) {
        landlines.push(phone);
      } else {
        invalid.push(phone);
      }
    });

    return {
      primary: mobiles[0] || "",
      all: mobiles,
      landlines,
      invalid
    };
  };

  const generateDataQualityReport = (processedData: any[]) => {
    const report = {
      totalRecords: processedData.length,
      multipleEmails: 0,
      multiplePhones: 0,
      landlineNumbers: 0,
      invalidEmails: 0,
      invalidPhones: 0,
      recordsWithoutEmail: 0,
      recordsWithoutPhone: 0
    };

    processedData.forEach(record => {
      if (record.emailData.all.length > 1) report.multipleEmails++;
      if (record.phoneData.all.length > 1) report.multiplePhones++;
      if (record.phoneData.landlines.length > 0) report.landlineNumbers++;
      if (record.emailData.invalid.length > 0) report.invalidEmails++;
      if (record.phoneData.invalid.length > 0) report.invalidPhones++;
      if (!record.emailData.primary) report.recordsWithoutEmail++;
      if (!record.phoneData.primary) report.recordsWithoutPhone++;
    });

    return report;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Reading file...');
    
    try {
      // Stage 1: Reading file (20%)
      setUploadProgress(20);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Stage 2: Processing data (40%)
      setUploadProgress(40);
      setUploadStatus('Processing and validating data...');
      
      const processedData = jsonData.map((row: any) => {
        const emailData = extractValidEmails(row.email || "");
        const phoneData = extractValidMobileNumbers(row.phone || "");

        return {
          vendor_name: row.vendor_name || row.name || "",
          vendor_code: row.vendor_code || row.code || "",
          email: emailData.primary,
          phone: phoneData.primary,
          msme_status: row.msme_status || "MSME Application Pending",
          msme_category: row.msme_category || null,
          business_category: row.business_category || null,
          location: row.location || null,
          udyam_number: row.udyam_number || null,
          opening_balance: row.opening_balance ? parseFloat(row.opening_balance) : null,
          credit_amount: row.credit_amount ? parseFloat(row.credit_amount) : null,
          debit_amount: row.debit_amount ? parseFloat(row.debit_amount) : null,
          closing_balance: row.closing_balance ? parseFloat(row.closing_balance) : null,
          emailData,
          phoneData
        };
      });

      // Generate quality report
      const qualityReport = generateDataQualityReport(processedData);

      // Remove processing data before inserting to database
      const vendorData = processedData.map(({ emailData, phoneData, ...vendor }) => vendor);

      // Stage 3: Validating duplicates (60%)
      setUploadProgress(60);
      setUploadStatus('Checking for duplicates...');
      
      // Check for duplicate vendor codes within the upload
      const vendorCodes = vendorData.map(v => v.vendor_code);
      const duplicateCodesInFile = vendorCodes.filter((code, index) => vendorCodes.indexOf(code) !== index);
      
      if (duplicateCodesInFile.length > 0) {
        toast({
          title: "Upload Failed",
          description: `Duplicate vendor codes found in file: ${[...new Set(duplicateCodesInFile)].join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Check for existing vendor codes in database
      const { data: existingVendors, error: checkError } = await supabase
        .from("vendors")
        .select("vendor_code")
        .in("vendor_code", vendorCodes);

      if (checkError) {
        console.error("Error checking existing vendors:", checkError);
        toast({
          title: "Error",
          description: "Failed to validate vendor codes",
          variant: "destructive",
        });
        return;
      }

      const existingCodes = existingVendors?.map(v => v.vendor_code) || [];
      const duplicateCodesInDB = vendorCodes.filter(code => existingCodes.includes(code));

      if (duplicateCodesInDB.length > 0) {
        toast({
          title: "Upload Failed",
          description: `Vendor codes already exist in database: ${duplicateCodesInDB.join(', ')}. Please use unique vendor codes.`,
          variant: "destructive",
        });
        return;
      }

      // Stage 4: Final validation (80%)
      setUploadProgress(80);
      setUploadStatus('Finalizing data...');
      
      // Filter out records with empty vendor_code or vendor_name
      const validVendorData = vendorData.filter(vendor => 
        vendor.vendor_code && vendor.vendor_code.trim() !== '' && 
        vendor.vendor_name && vendor.vendor_name.trim() !== ''
      );

      if (validVendorData.length === 0) {
        toast({
          title: "Upload Failed",
          description: "No valid records found. Please ensure vendor_code and vendor_name are provided.",
          variant: "destructive",
        });
        return;
      }

      if (validVendorData.length < vendorData.length) {
        const skippedCount = vendorData.length - validVendorData.length;
        toast({
          title: "Warning",
          description: `${skippedCount} records skipped due to missing vendor_code or vendor_name`,
          variant: "destructive",
        });
      }

      // Stage 5: Saving to database (100%)
      setUploadProgress(95);
      setUploadStatus('Saving to database...');
      
      const { error } = await supabase
        .from("vendors")
        .insert(validVendorData);

      if (error) {
        console.error("Database error:", error);
        if (error.code === '23505') {
          toast({
            title: "Upload Failed",
            description: "Duplicate vendor codes detected. Please ensure all vendor codes are unique.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Upload Failed",
            description: `Database error: ${error.message}`,
            variant: "destructive",
          });
        }
        return;
      }

      setUploadProgress(100);
      setUploadStatus('Upload completed!');

      // Show detailed success message with quality report
      const reportMessages = [];
      if (qualityReport.multipleEmails > 0) {
        reportMessages.push(`${qualityReport.multipleEmails} records had multiple emails (used first valid)`);
      }
      if (qualityReport.multiplePhones > 0) {
        reportMessages.push(`${qualityReport.multiplePhones} records had multiple phone numbers (used first mobile)`);
      }
      if (qualityReport.landlineNumbers > 0) {
        reportMessages.push(`${qualityReport.landlineNumbers} landline numbers filtered out`);
      }
      if (qualityReport.invalidEmails > 0) {
        reportMessages.push(`${qualityReport.invalidEmails} invalid emails found`);
      }
      if (qualityReport.invalidPhones > 0) {
        reportMessages.push(`${qualityReport.invalidPhones} invalid phone numbers found`);
      }
      if (qualityReport.recordsWithoutEmail > 0) {
        reportMessages.push(`${qualityReport.recordsWithoutEmail} records without valid email`);
      }
      if (qualityReport.recordsWithoutPhone > 0) {
        reportMessages.push(`${qualityReport.recordsWithoutPhone} records without valid mobile number`);
      }

      toast({
        title: "Success",
        description: `${validVendorData.length} vendors uploaded successfully${reportMessages.length > 0 ? '. ' + reportMessages.join(', ') : ''}`,
      });

      fetchVendors();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload vendor data",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
      }, 1000);
      // Reset file input
      event.target.value = "";
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(vendors);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
    XLSX.writeFile(workbook, "vendors.xlsx");
    
    toast({
      title: "Success",
      description: "Vendors exported to Excel successfully",
    });
  };

  const downloadTemplate = () => {
    const templateData = [{
      vendor_name: "Example Vendor",
      vendor_code: "EV001",
      email: "vendor@example.com",
      phone: "+919876543210",
      msme_status: "MSME Certified",
      msme_category: "Small",
      business_category: "Manufacturing",
      location: "Mumbai",
      udyam_number: "UDYAM-MH-01-1234567",
      opening_balance: 10000,
      credit_amount: 5000,
      debit_amount: 2000,
      closing_balance: 13000,
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendor Template");
    XLSX.writeFile(workbook, "vendor_template.xlsx");

    toast({
      title: "Success",
      description: "Template downloaded successfully",
    });
  };

  const downloadAttachments = async () => {
    try {
      toast({
        title: "Download Started",
        description: "Preparing files for download...",
      });

      // Fetch all document uploads
      const { data: documents, error: docError } = await supabase
        .from('document_uploads')
        .select('*');

      if (docError) throw docError;

      if (!documents || documents.length === 0) {
        toast({
          title: "No Files Found",
          description: "No MSME documents available for download",
          variant: "destructive",
        });
        return;
      }

      const zip = new JSZip();

      // Download each file and add to zip
      for (const doc of documents) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('msme-documents')
            .download(doc.file_name);

          if (downloadError) {
            console.error(`Error downloading ${doc.file_name}:`, downloadError);
            continue; // Skip this file and continue with others
          }

          if (fileData) {
            zip.file(doc.file_name, fileData);
          }
        } catch (error) {
          console.error(`Error processing ${doc.file_name}:`, error);
        }
      }

      // Generate and download the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MSME_Documents_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: `Downloaded ${documents.length} files successfully`,
      });

    } catch (error) {
      console.error('Error downloading attachments:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download vendor files",
        variant: "destructive",
      });
    }
  };

  const downloadVendorDocument = async (vendorId: string, vendorName: string) => {
    try {
      console.log('Download requested for vendor:', vendorId, vendorName);
      const document = vendorDocuments[vendorId];
      console.log('Document found:', document);
      
      if (!document) {
        toast({
          title: "No Document Found",
          description: "No document available for this vendor",
          variant: "destructive",
        });
        return;
      }

      // Remove bucket prefix from file_path if it exists
      const filePath = document.file_path.replace('msme-documents/', '');
      console.log('Attempting to download file from path:', filePath);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('msme-documents')
        .download(filePath);

      if (downloadError) {
        console.error(`Error downloading ${document.file_path}:`, downloadError);
        toast({
          title: "Download Failed",
          description: `Failed to download document: ${downloadError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (fileData) {
        console.log('File data received, creating download link');
        const url = URL.createObjectURL(fileData);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${vendorName}_${document.file_name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Download Complete",
          description: `Document downloaded successfully for ${vendorName}`,
        });
      }
    } catch (error) {
      console.error('Error downloading vendor document:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download vendor document",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "MSME Certified":
        return "bg-green-50 text-green-700 border-green-200";
      case "Non MSME":
        return "bg-red-50 text-red-700 border-red-200";
      case "MSME Application Pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Micro":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Small":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Medium":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  console.log("Vendors component state:", { loading, vendorsCount: vendors.length });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-4">Loading vendors...</div>
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
            <FileDown className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button onClick={downloadAttachments} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Files
          </Button>
          <Button onClick={exportToExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Vendor Data</CardTitle>
          <CardDescription>
            Upload vendor data from an Excel file. The file should contain columns like vendor_name, vendor_code, email, phone, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Choose Excel File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="mt-2"
              />
            </div>
            {uploading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{uploadStatus}</span>
                  <span className="text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor List ({vendors.length})</CardTitle>
          <CardDescription>
            All registered vendors in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vendors found. Upload some vendor data to get started.
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <ScrollArea className="h-[600px] w-full">
                <Table className="w-full">
                   <TableHeader>
                     <TableRow>
                       <TableHead className="w-[120px]">Vendor Name</TableHead>
                       <TableHead className="w-[80px]">Code</TableHead>
                       <TableHead className="w-[140px]">Email</TableHead>
                       <TableHead className="w-[100px]">Phone</TableHead>
                       <TableHead className="w-[120px]">MSME Status</TableHead>
                       <TableHead className="w-[80px]">Category</TableHead>
                       <TableHead className="w-[100px]">Location</TableHead>
                       <TableHead className="w-[100px]">Document</TableHead>
                     </TableRow>
                   </TableHeader>
                     <TableBody>
                       {vendors.map((vendor) => (
                         <TableRow key={vendor.id}>
                           <TableCell className="font-medium truncate max-w-[120px]">{vendor.vendor_name}</TableCell>
                           <TableCell className="truncate">{vendor.vendor_code}</TableCell>
                           <TableCell className="truncate max-w-[140px]" title={vendor.email || ""}>
                             {vendor.email || "—"}
                           </TableCell>
                           <TableCell className="truncate">{vendor.phone || "—"}</TableCell>
                           <TableCell>
                             <Badge className={`${getStatusColor(vendor.msme_status || "")} text-xs`}>
                               {vendor.msme_status}
                             </Badge>
                           </TableCell>
                           <TableCell>
                             {vendor.msme_category ? (
                               <Badge className={`${getCategoryColor(vendor.msme_category)} text-xs`}>
                                 {vendor.msme_category}
                               </Badge>
                             ) : (
                               "—"
                             )}
                           </TableCell>
                           <TableCell className="truncate">{vendor.location || "—"}</TableCell>
                           <TableCell>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => downloadVendorDocument(vendor.id, vendor.vendor_name)}
                               disabled={!vendorDocuments[vendor.id]}
                               className="px-2"
                             >
                               <Download className="h-3 w-3" />
                             </Button>
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