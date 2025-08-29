import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import fastApiClient from "@/lib/fastapi-client";
import { Upload } from "lucide-react";

interface VendorUploadProps {
  onUploadComplete?: () => void;
}

export function VendorUpload({ onUploadComplete }: VendorUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading file...');

    try {
      // Test backend connection first
      setUploadStatus('Connecting to server...');
      setUploadProgress(10);

      const isConnected = await fastApiClient.testConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to backend server. Please ensure the backend is running on http://127.0.0.1:8000');
      }

      setUploadStatus('Processing CSV file...');
      setUploadProgress(30);

      // Upload the CSV file
      const result = await fastApiClient.vendors.uploadCsv(file);

      setUploadProgress(100);

      if (result.success) {
        toast({
          title: "Upload Successful",
          description: `${result.vendors_created || 0} vendors imported successfully`,
        });

        // Show detailed results
        if (result.import_errors && result.import_errors.length > 0) {
          console.warn('Import errors:', result.import_errors);
        }
        
        if (result.creation_errors && result.creation_errors.length > 0) {
          console.warn('Creation errors:', result.creation_errors);
        }

        setUploadStatus(`Import complete: ${result.vendors_created || 0} vendors created`);
        
        // Call callback to refresh vendor list
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
      setUploadStatus('Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Vendor CSV
        </CardTitle>
        <CardDescription>
          Upload vendor data from a CSV file. Required columns: company_name, vendor_code, email.
          Optional columns: contact_person_name, phone_number, registered_address, etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="vendor-file">CSV File</Label>
          <Input
            id="vendor-file"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{uploadStatus}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>CSV Format Requirements:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Required:</strong> company_name, vendor_code, email</li>
            <li><strong>Optional:</strong> contact_person_name, phone_number, registered_address, country_origin</li>
            <li><strong>Business:</strong> supplier_type, supplier_category, annual_turnover, year_established</li>
            <li><strong>Legal:</strong> pan_number, gst_number, gta_registration</li>
            <li><strong>Compliance:</strong> nda, sqa, four_m, code_of_conduct (true/false)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
