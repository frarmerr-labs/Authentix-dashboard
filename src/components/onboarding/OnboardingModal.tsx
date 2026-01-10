"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [industry, setIndustry] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const company = await api.companies.get();

      // Show onboarding if industry is not set
      if (!company.industry) {
        // Check if user has dismissed onboarding before
        const dismissed = localStorage.getItem('onboarding_dismissed');
        if (!dismissed) {
          setOpen(true);
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleSave = async () => {
    if (!industry) return;

    setSaving(true);
    try {
      await api.companies.update({ industry });

      setOpen(false);
    } catch (error: any) {
      console.error('Error saving industry:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Welcome! Let's set up your company
          </DialogTitle>
          <DialogDescription className="pt-2">
            Help us personalize your experience by selecting your industry.
            This will help us show relevant certificate categories.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="industry" className="text-sm font-medium">
              Industry
            </Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select your industry" />
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
            <p className="text-xs text-muted-foreground">
              You can change this later in Company Settings
            </p>
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={saving}
          >
            Skip for now
          </Button>
          <Button
            onClick={handleSave}
            disabled={!industry || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
