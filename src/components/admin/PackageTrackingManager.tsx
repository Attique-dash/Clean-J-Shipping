"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Package, Clock, CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
import { useNotification } from "@/contexts/NotificationContext";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TrackingHistoryEntry {
  id: string;
  status: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  scanType: string | null;
  scanLocation: string | null;
  timestamp: string;
  performedBy: {
    name: string;
    email: string;
  } | null;
}

interface PackageTrackingManagerProps {
  packageId: string;
  trackingNumber: string;
  currentStatus: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "received", label: "Received", color: "bg-blue-100 text-blue-800" },
  { value: "in_transit", label: "In Transit", color: "bg-indigo-100 text-indigo-800" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "bg-purple-100 text-purple-800" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800" },
  { value: "exception", label: "Exception", color: "bg-red-100 text-red-800" },
  { value: "returned", label: "Returned", color: "bg-orange-100 text-orange-800" },
  { value: "lost", label: "Lost", color: "bg-gray-100 text-gray-800" },
  { value: "damaged", label: "Damaged", color: "bg-red-100 text-red-800" },
];

const SCAN_TYPES = [
  { value: "pickup", label: "Pickup" },
  { value: "received", label: "Received at Facility" },
  { value: "in_transit", label: "In Transit" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "exception", label: "Exception" },
  { value: "returned", label: "Returned" },
  { value: "hold", label: "On Hold" },
];

export default function PackageTrackingManager({
  packageId,
  trackingNumber,
  currentStatus,
  isOpen,
  onClose,
  onUpdate,
}: PackageTrackingManagerProps) {
  const [trackingHistory, setTrackingHistory] = useState<TrackingHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"update" | "history">("update");
  
  // Form state
  const [status, setStatus] = useState(currentStatus);
  const [statusReason, setStatusReason] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [scanType, setScanType] = useState("");
  const [scanLocation, setScanLocation] = useState("");
  const [description, setDescription] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  
  const { addNotification } = useNotification();

  // Fetch tracking history
  const fetchTrackingHistory = useCallback(async () => {
    if (!packageId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/packages/${packageId}/tracking`);
      const data = await response.json();
      
      if (data.success) {
        setTrackingHistory(data.data.trackingHistory);
      }
    } catch (error) {
      console.error("Error fetching tracking history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    if (isOpen) {
      fetchTrackingHistory();
      setStatus(currentStatus);
    }
  }, [isOpen, currentStatus, fetchTrackingHistory]);

  // Get current geolocation
  useEffect(() => {
    if (useCurrentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
          addNotification("Location captured. Current coordinates have been filled in.", "success");
        },
        (error) => {
          console.error("Geolocation error:", error);
          addNotification("Location error: Could not get current location. Please enter manually.", "error");
          setUseCurrentLocation(false);
        }
      );
    }
  }, [useCurrentLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!status) {
      addNotification("Please select a status", "error");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/admin/packages/${packageId}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          statusReason: statusReason || undefined,
          location: location || undefined,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          scanType: scanType || undefined,
          scanLocation: scanLocation || undefined,
          description: description || undefined,
          notifyCustomer,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addNotification("Tracking updated successfully", "success");
        
        // Reset form
        setStatusReason("");
        setLocation("");
        setLatitude("");
        setLongitude("");
        setScanType("");
        setScanLocation("");
        setDescription("");
        
        // Refresh history
        fetchTrackingHistory();
        
        // Notify parent
        onUpdate?.();
        
        // Switch to history tab to show the update
        setActiveTab("history");
      } else {
        throw new Error(data.error || "Failed to update tracking");
      }
    } catch (error) {
      console.error("Error updating tracking:", error);
      addNotification(error instanceof Error ? error.message : "Failed to update tracking", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusConfig = (statusValue: string) => {
    return STATUS_OPTIONS.find(s => s.value === statusValue) || STATUS_OPTIONS[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            Package Tracking Manager
          </DialogTitle>
          <DialogDescription>
            Tracking #: {trackingNumber}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "update" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("update")}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            Update Status
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("history")}
            className="flex-1"
          >
            <Clock className="h-4 w-4 mr-2" />
            History ({trackingHistory.length})
          </Button>
        </div>

        {activeTab === "update" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-4">
                {/* Status Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${option.color.split(" ")[0].replace("bg-", "bg-").replace("-100", "-500")}`} />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="scanType">Scan Type</Label>
                    <Select value={scanType} onValueChange={setScanType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select scan type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCAN_TYPES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status Reason */}
                <div className="space-y-2">
                  <Label htmlFor="statusReason">Status Reason (optional)</Label>
                  <Input
                    id="statusReason"
                    placeholder="e.g., Customs clearance, Address issue, etc."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="location">Location</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="use-location"
                        checked={useCurrentLocation}
                        onCheckedChange={setUseCurrentLocation}
                      />
                      <Label htmlFor="use-location" className="text-sm text-muted-foreground cursor-pointer">
                        Use current GPS
                      </Label>
                    </div>
                  </div>
                  <Input
                    id="location"
                    placeholder="e.g., Kingston Warehouse, Miami Hub, etc."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="e.g., 18.0179"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="e.g., -76.8099"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </div>
                </div>

                {/* Scan Location */}
                <div className="space-y-2">
                  <Label htmlFor="scanLocation">Scan Location / Facility</Label>
                  <Input
                    id="scanLocation"
                    placeholder="e.g., Kingston Distribution Center"
                    value={scanLocation}
                    onChange={(e) => setScanLocation(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description / Notes</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional details about this status update..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Notify Customer */}
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    id="notify"
                    checked={notifyCustomer}
                    onCheckedChange={setNotifyCustomer}
                  />
                  <Label htmlFor="notify" className="cursor-pointer">
                    Send email notification to customer
                  </Label>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Update Tracking
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : trackingHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tracking history available</p>
              </div>
            ) : (
              <ScrollArea className="h-[50vh]">
                <div className="space-y-4 pr-4">
                  {trackingHistory.map((entry, index) => {
                    const statusConfig = getStatusConfig(entry.status);
                    const isLatest = index === 0;
                    
                    return (
                      <Card key={entry.id} className={isLatest ? "border-blue-500 border-2" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-full ${statusConfig.color}`}>
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(entry.timestamp)}
                                </span>
                              </div>
                              
                              {entry.location && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {entry.location}
                                </div>
                              )}
                              
                              {entry.description && (
                                <p className="text-sm">{entry.description}</p>
                              )}
                              
                              {entry.scanLocation && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Navigation className="h-3 w-3" />
                                  {entry.scanLocation}
                                </div>
                              )}
                              
                              {entry.performedBy && (
                                <div className="text-xs text-muted-foreground">
                                  By: {entry.performedBy.name}
                                </div>
                              )}
                              
                              {entry.latitude && entry.longitude && (
                                <div className="text-xs text-muted-foreground">
                                  Coordinates: {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            <DialogFooter>
              <Button onClick={() => setActiveTab("update")}>
                <Send className="mr-2 h-4 w-4" />
                Add Update
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
