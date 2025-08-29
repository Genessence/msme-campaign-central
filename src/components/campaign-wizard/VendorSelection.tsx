import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import fastApiClient from '@/lib/fastapi-client';
import { CampaignFormData } from '@/pages/CreateCampaign';

interface VendorSelectionProps {
  data: CampaignFormData;
  onUpdate: (data: Partial<CampaignFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

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
  is_active?: boolean;
}

export function VendorSelection({ data, onUpdate, onNext, onPrev }: VendorSelectionProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (vendors.length > 0) {
      filterVendors();
    }
  }, [vendors, searchTerm, statusFilter, categoryFilter, groupFilter]);

  const fetchVendors = async () => {
    try {
      const vendorData = await fastApiClient.vendors.getAll(0, 1000); // Use reasonable limit
      console.log('Fetched vendors for campaign:', vendorData);
      setVendors(Array.isArray(vendorData) ? vendorData : []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const filterVendors = () => {
    let filtered = vendors;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(vendor =>
        vendor.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.vendor_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.contact_person_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // MSME status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(vendor => vendor.msme_status?.toLowerCase() === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(vendor => vendor.supplier_category?.toLowerCase() === categoryFilter);
    }

    // Group filter (using supplier_type)
    if (groupFilter !== 'all') {
      filtered = filtered.filter(vendor => vendor.supplier_type?.toLowerCase() === groupFilter);
    }

    setFilteredVendors(filtered);
  };

  const handleVendorSelect = (vendorId: string, selected: boolean) => {
    console.log('Vendor selection:', { vendorId, selected, currentSelected: data.selectedVendors });
    let newSelectedVendors = [...(data.selectedVendors || [])];
    
    if (selected) {
      if (!newSelectedVendors.includes(vendorId)) {
        newSelectedVendors.push(vendorId);
      }
    } else {
      newSelectedVendors = newSelectedVendors.filter(id => id !== vendorId);
    }
    
    console.log('New selected vendors:', newSelectedVendors);
    onUpdate({ selectedVendors: newSelectedVendors });
  };

  const handleSelectAll = () => {
    const allVendorIds = filteredVendors.map(vendor => vendor.id);
    onUpdate({ selectedVendors: allVendorIds });
  };

  const handleDeselectAll = () => {
    onUpdate({ selectedVendors: [] });
  };

  const handleNext = () => {
    if (!data.selectedVendors || data.selectedVendors.length === 0) {
      alert('Please select at least one vendor before proceeding.');
      return;
    }
    onNext();
  };

  // Get unique categories for filter
  const categories = [...new Set(vendors.map(v => v.supplier_category).filter(Boolean))];
  const statuses = [...new Set(vendors.map(v => v.msme_status).filter(Boolean))];
  const groups = [...new Set(vendors.map(v => v.supplier_type).filter(Boolean))];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Target Vendors</CardTitle>
          <CardDescription>Choose vendors to include in your campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading vendors...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Target Vendors</CardTitle>
        <CardDescription>
          Choose vendors to include in your campaign ({data.selectedVendors?.length || 0} selected)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">MSME Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status.toLowerCase()}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category.toLowerCase()}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group">Type</Label>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {groups.map(group => (
                  <SelectItem key={group} value={group.toLowerCase()}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSelectAll} variant="outline" size="sm">
            Select All ({filteredVendors.length})
          </Button>
          <Button onClick={handleDeselectAll} variant="outline" size="sm">
            Deselect All
          </Button>
        </div>

        {/* Vendor List */}
        <div className="border rounded-lg">
          <div className="max-h-96 overflow-y-auto">
            {filteredVendors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {vendors.length === 0 ? 'No vendors found. Add some vendors first.' : 'No vendors match the current filters.'}
              </div>
            ) : (
              <div className="space-y-0">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="flex items-center space-x-3 p-4 border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={data.selectedVendors?.includes(vendor.id) || false}
                      onCheckedChange={(checked) => handleVendorSelect(vendor.id, checked as boolean)}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{vendor.company_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {vendor.vendor_code}
                        </Badge>
                        {vendor.msme_status && (
                          <Badge variant="secondary" className="text-xs">
                            {vendor.msme_status}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {vendor.contact_person_name && <span>{vendor.contact_person_name} • </span>}
                        {vendor.email && <span>{vendor.email} • </span>}
                        {vendor.supplier_category && <span>{vendor.supplier_category}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Count */}
        <div className="text-sm text-muted-foreground">
          {data.selectedVendors?.length || 0} vendor(s) selected out of {filteredVendors.length} displayed
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button onClick={onPrev} variant="outline">
            Previous
          </Button>
          <Button onClick={handleNext}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
