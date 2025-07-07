import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Tables } from "@/integrations/supabase/types";

type Vendor = Tables<"vendors">;

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVendors(data || []);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Map Excel data to vendor format
      const vendorData = jsonData.map((row: any) => ({
        vendor_name: row.vendor_name || row.name || "",
        vendor_code: row.vendor_code || row.code || "",
        email: row.email || "",
        phone: row.phone || "",
        msme_status: row.msme_status || "MSME Application Pending",
        msme_category: row.msme_category || null,
        business_category: row.business_category || null,
        location: row.location || null,
        udyam_number: row.udyam_number || null,
        opening_balance: row.opening_balance ? parseFloat(row.opening_balance) : null,
        credit_amount: row.credit_amount ? parseFloat(row.credit_amount) : null,
        debit_amount: row.debit_amount ? parseFloat(row.debit_amount) : null,
        closing_balance: row.closing_balance ? parseFloat(row.closing_balance) : null,
      }));

      const { error } = await supabase
        .from("vendors")
        .insert(vendorData);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${vendorData.length} vendors uploaded successfully`,
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
      setUploading(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "MSME Certified":
        return "bg-green-100 text-green-800";
      case "Non MSME":
        return "bg-red-100 text-red-800";
      case "MSME Application Pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Micro":
        return "bg-blue-100 text-blue-800";
      case "Small":
        return "bg-purple-100 text-purple-800";
      case "Medium":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">
            Manage your vendor database, upload new vendors, and export data.
          </p>
        </div>
        <div className="flex gap-2">
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
              <div className="text-sm text-muted-foreground">
                Uploading vendors...
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
          {loading ? (
            <div className="text-center py-4">Loading vendors...</div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vendors found. Upload some vendor data to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>MSME Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                      <TableCell>{vendor.vendor_code}</TableCell>
                      <TableCell>{vendor.email || "—"}</TableCell>
                      <TableCell>{vendor.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(vendor.msme_status || "")}>
                          {vendor.msme_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vendor.msme_category ? (
                          <Badge className={getCategoryColor(vendor.msme_category)}>
                            {vendor.msme_category}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{vendor.location || "—"}</TableCell>
                      <TableCell>
                        {vendor.closing_balance ? `₹${vendor.closing_balance.toLocaleString()}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}