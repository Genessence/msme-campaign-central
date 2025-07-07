import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Vendor = Tables<"vendors">;

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  console.log("Vendors component rendering...");

  useEffect(() => {
    console.log("Vendors useEffect running...");
    fetchVendors();
  }, []);

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
            Manage your vendor database.
          </p>
        </div>
      </div>

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