import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Tables } from "@/integrations/supabase/types";

type Vendor = Tables<"vendors">;

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    msmeStatus: "",
    msmeCategory: "",
    location: "",
  });
  const { toast } = useToast();

  console.log("Vendors component rendering...");

  useEffect(() => {
    console.log("Vendors useEffect running...");
    fetchVendors();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [vendors, filters]);

  const applyFilters = () => {
    let filtered = vendors;

    if (filters.search) {
      filtered = filtered.filter(vendor => 
        vendor.vendor_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        vendor.vendor_code.toLowerCase().includes(filters.search.toLowerCase()) ||
        (vendor.email?.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }

    if (filters.msmeStatus) {
      filtered = filtered.filter(vendor => vendor.msme_status === filters.msmeStatus);
    }

    if (filters.msmeCategory) {
      filtered = filtered.filter(vendor => vendor.msme_category === filters.msmeCategory);
    }

    if (filters.location) {
      filtered = filtered.filter(vendor => 
        vendor.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    setFilteredVendors(filtered);
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
    const worksheet = XLSX.utils.json_to_sheet(filteredVendors);
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

  const downloadAttachments = () => {
    // Dummy function for now
    toast({
      title: "Download Started",
      description: "Vendor attachments download will be implemented soon",
    });
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
    <div className="container mx-auto p-6 space-y-6">
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
              <div className="text-sm text-muted-foreground">
                Uploading vendors...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor List ({filteredVendors.length})</CardTitle>
          <CardDescription>
            All registered vendors in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search vendors..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="msme-status">MSME Status</Label>
              <Select
                value={filters.msmeStatus}
                onValueChange={(value) => setFilters({ ...filters, msmeStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="MSME Certified">MSME Certified</SelectItem>
                  <SelectItem value="Non MSME">Non MSME</SelectItem>
                  <SelectItem value="MSME Application Pending">MSME Application Pending</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="msme-category">MSME Category</Label>
              <Select
                value={filters.msmeCategory}
                onValueChange={(value) => setFilters({ ...filters, msmeCategory: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  <SelectItem value="Micro">Micro</SelectItem>
                  <SelectItem value="Small">Small</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Filter by location..."
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              />
            </div>
          </div>

          {filteredVendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {vendors.length === 0 
                ? "No vendors found. Upload some vendor data to get started."
                : "No vendors match the current filters."
              }
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
                  {filteredVendors.map((vendor) => (
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