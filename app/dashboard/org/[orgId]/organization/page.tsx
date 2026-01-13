"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Upload, Loader2, CheckCircle2, Globe, MapPin, Phone, Mail } from "lucide-react";
import { api } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";

export default function OrganizationPage() {
  const [organizationData, setOrganizationData] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    gst_number: "",
    cin_number: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [applicationId, setApplicationId] = useState("");

  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = async () => {
    try {
      const organization = await api.organizations.get();

      setOrganizationData({
        name: organization.name || "",
        email: organization.email || "",
        phone: organization.phone || "",
        website: organization.website || "",
        industry: organization.industry || "",
        address: organization.address || "",
        city: organization.city || "",
        state: organization.state || "",
        country: organization.country || "",
        postal_code: organization.postal_code || "",
        gst_number: organization.gst_number || "",
        cin_number: organization.cin_number || "",
      });
      setLogoPreview(organization.logo || "");

      // Load application_id from API settings separately
      try {
        const apiSettings = await api.organizations.getAPISettings();
        setApplicationId(apiSettings.application_id || "");
      } catch {
        // API settings may not be available yet
      }
    } catch (error) {
      console.error('Error loading organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setLogo(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setError("Please upload an image file");
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const updatedOrganization = await api.organizations.update(organizationData, logo || undefined);
      
      if (updatedOrganization.logo) {
        setLogoPreview(updatedOrganization.logo);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setLogo(null); // Clear logo file after successful upload
    } catch (err: any) {
      setError(err.message || "Failed to save organization profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization information
          </p>
        </div>
        {success && (
          <Badge className="bg-green-500 gap-1.5 text-xs">
            <CheckCircle2 className="h-3 w-3" />
            Saved
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Logo and Basic Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Logo Section */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('logo')?.click()}
                  className="w-full"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {logoPreview ? 'Change' : 'Upload'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  PNG, JPG (max 2MB)
                </p>
              </div>

              {/* Basic Info */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase text-muted-foreground">
                    Organization Name
                  </Label>
                  <Input
                    id="name"
                    value={organizationData.name}
                    onChange={(e) => setOrganizationData({ ...organizationData, name: e.target.value })}
                    required
                    className="text-lg font-semibold h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={organizationData.email}
                      onChange={(e) => setOrganizationData({ ...organizationData, email: e.target.value })}
                      placeholder="contact@organization.com"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={organizationData.phone}
                      onChange={(e) => setOrganizationData({ ...organizationData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-xs flex items-center gap-1.5">
                    <Globe className="h-3 w-3" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={organizationData.website}
                    onChange={(e) => setOrganizationData({ ...organizationData, website: e.target.value })}
                    placeholder="https://organization.com"
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-xs flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" />
                    Industry
                  </Label>
                  <Select
                    value={organizationData.industry}
                    onValueChange={(value) => setOrganizationData({ ...organizationData, industry: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EdTech">EdTech</SelectItem>
                      <SelectItem value="Corporate">Corporate</SelectItem>
                      <SelectItem value="School">School</SelectItem>
                      <SelectItem value="College / University">College / University</SelectItem>
                      <SelectItem value="Government">Government</SelectItem>
                      <SelectItem value="Training Institute">Training Institute</SelectItem>
                      <SelectItem value="NGO">NGO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address and Tax Info in 2 columns */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Address */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-muted flex items-center justify-center">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-xs">Street Address</Label>
                <Input
                  id="address"
                  value={organizationData.address}
                  onChange={(e) => setOrganizationData({ ...organizationData, address: e.target.value })}
                  placeholder="123 Main St"
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-xs">City</Label>
                  <Input
                    id="city"
                    value={organizationData.city}
                    onChange={(e) => setOrganizationData({ ...organizationData, city: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-xs">State</Label>
                  <Input
                    id="state"
                    value={organizationData.state}
                    onChange={(e) => setOrganizationData({ ...organizationData, state: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-xs">Country</Label>
                  <Input
                    id="country"
                    value={organizationData.country}
                    onChange={(e) => setOrganizationData({ ...organizationData, country: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code" className="text-xs">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={organizationData.postal_code}
                    onChange={(e) => setOrganizationData({ ...organizationData, postal_code: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                Tax Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="gst_number" className="text-xs">GST Number</Label>
                <Input
                  id="gst_number"
                  value={organizationData.gst_number}
                  onChange={(e) => setOrganizationData({ ...organizationData, gst_number: e.target.value })}
                  placeholder="22AAAAA0000A1Z5"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cin_number" className="text-xs">CIN Number</Label>
                <Input
                  id="cin_number"
                  value={organizationData.cin_number}
                  onChange={(e) => setOrganizationData({ ...organizationData, cin_number: e.target.value })}
                  placeholder="U74999MH2020PTC123456"
                  className="h-9"
                />
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Tax information is optional and used for invoicing purposes
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2.5 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" className="h-9 px-6" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
