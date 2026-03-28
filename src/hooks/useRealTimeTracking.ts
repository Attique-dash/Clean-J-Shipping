"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { useNotification } from "@/contexts/NotificationContext";

interface TrackingData {
  trackingNumber: string;
  status: string;
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
    lastUpdated: string;
  };
  statusHistory?: Array<{
    status: string;
    location?: {
      lat: number;
      lng: number;
      address: string;
    };
    address?: string;
    timestamp: string;
    description?: string;
  }>;
}

interface UseRealTimeTrackingOptions {
  trackingNumber: string;
  onUpdate?: (data: TrackingData) => void;
  onLocationChange?: (location: { lat: number; lng: number; address?: string }) => void;
  onStatusChange?: (status: string, previousStatus?: string) => void;
  enablePolling?: boolean;
  pollingInterval?: number;
}

export function useRealTimeTracking({
  trackingNumber,
  onUpdate,
  onLocationChange,
  onStatusChange,
  enablePolling = true,
  pollingInterval = 30000, // 30 seconds
}: UseRealTimeTrackingOptions) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  const { socket, isConnected, lastMessage } = useWebSocket();
  const { addNotification } = useNotification();
  
  const previousStatusRef = useRef<string | undefined>(undefined);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Fetch initial data
  const fetchTrackingData = useCallback(async () => {
    if (!trackingNumber) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tracking/${encodeURIComponent(trackingNumber)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Package not found");
        }
        throw new Error("Failed to fetch tracking data");
      }
      
      const trackingData = await response.json();
      
      previousStatusRef.current = trackingData.status;
      setData(trackingData);
      onUpdate?.(trackingData);
      
      lastUpdateRef.current = Date.now();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load tracking data";
      setError(errorMessage);
      console.error("Tracking fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [trackingNumber, onUpdate]);

  // Initial fetch
  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  // Subscribe to WebSocket events for this package
  useEffect(() => {
    if (!socket || !isConnected || !trackingNumber) return;

    // Join package-specific room
    socket.emit("track:package", { trackingNumber });
    setIsLive(true);

    // Listen for package updates
    const handlePackageUpdate = (message: any) => {
      if (message?.data?.trackingNumber === trackingNumber) {
        console.log("Real-time update received:", message);
        
        const updateData = message.data;
        
        // Update local data
        setData((prev) => {
          if (!prev) return prev;
          
          const newData = {
            ...prev,
            status: updateData.status || prev.status,
            currentLocation: updateData.location ? {
              lat: updateData.location.latitude,
              lng: updateData.location.longitude,
              address: updateData.location.address,
              lastUpdated: new Date().toISOString(),
            } : prev.currentLocation,
          };
          
          // Add to history if it's a new update
          if (updateData.status && updateData.status !== prev.status) {
            newData.statusHistory = [
              {
                status: updateData.status,
                location: updateData.location,
                timestamp: new Date().toISOString(),
                description: updateData.description || `Status updated to ${updateData.status}`,
              },
              ...(prev.statusHistory || []),
            ];
          }
          
          return newData;
        });

        // Trigger callbacks
        if (updateData.location) {
          onLocationChange?.({
            lat: updateData.location.latitude,
            lng: updateData.location.longitude,
            address: updateData.location.address,
          });
        }

        if (updateData.status && updateData.status !== previousStatusRef.current) {
          onStatusChange?.(updateData.status, previousStatusRef.current);
          previousStatusRef.current = updateData.status;
          
          // Show toast notification
          addNotification("Package Update: Status changed to: " + updateData.status, "info");
        }

        lastUpdateRef.current = Date.now();
        onUpdate?.(updateData);
      }
    };

    socket.on("package:update", handlePackageUpdate);
    socket.on("package:location", handlePackageUpdate);
    socket.on("message", (message) => {
      if (message?.type === "package_update") {
        handlePackageUpdate(message);
      }
    });

    return () => {
      socket.off("package:update", handlePackageUpdate);
      socket.off("package:location", handlePackageUpdate);
      socket.off("message", handlePackageUpdate);
    };
  }, [socket, isConnected, trackingNumber, onUpdate, onLocationChange, onStatusChange, addNotification]);

  // Polling fallback when WebSocket is not connected
  useEffect(() => {
    if (!enablePolling || !trackingNumber) return;

    // Only poll if WebSocket is not connected or hasn't received updates recently
    const shouldPoll = !isConnected || (Date.now() - lastUpdateRef.current > pollingInterval * 2);

    if (shouldPoll) {
      pollingRef.current = setInterval(() => {
        fetchTrackingData();
      }, pollingInterval);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [enablePolling, trackingNumber, pollingInterval, fetchTrackingData, isConnected]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchTrackingData();
    addNotification("Tracking data has been updated", "success");
  }, [fetchTrackingData, addNotification]);

  return {
    data,
    isLoading,
    error,
    isLive: isConnected && isLive,
    isConnected,
    refresh,
    lastUpdate: lastUpdateRef.current,
  };
}

// Hook for tracking multiple packages
export function useRealTimeTrackingList(trackingNumbers: string[]) {
  const [packages, setPackages] = useState<Record<string, TrackingData>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const { socket, isConnected, lastMessage } = useWebSocket();

  // Fetch all packages
  const fetchAll = useCallback(async () => {
    if (trackingNumbers.length === 0) return;
    
    setIsLoading(true);
    
    const results = await Promise.allSettled(
      trackingNumbers.map(async (tn) => {
        const response = await fetch(`/api/tracking/${encodeURIComponent(tn)}`);
        if (!response.ok) throw new Error(`Failed to fetch ${tn}`);
        return response.json();
      })
    );

    const newPackages: Record<string, TrackingData> = {};
    
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        newPackages[trackingNumbers[index]] = result.value;
      }
    });

    setPackages(newPackages);
    setIsLoading(false);
  }, [trackingNumbers]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Subscribe to updates for all packages
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to packages room
    socket.emit("subscribe:packages");

    const handleUpdate = (message: any) => {
      if (message?.data?.trackingNumber && trackingNumbers.includes(message.data.trackingNumber)) {
        setPackages((prev) => ({
          ...prev,
          [message.data.trackingNumber]: {
            ...prev[message.data.trackingNumber],
            ...message.data,
          },
        }));
      }
    };

    socket.on("package:update", handleUpdate);
    socket.on("message", (message) => {
      if (message?.type === "package_update") {
        handleUpdate(message);
      }
    });

    return () => {
      socket.off("package:update", handleUpdate);
      socket.off("message", handleUpdate);
    };
  }, [socket, isConnected, trackingNumbers]);

  return {
    packages,
    isLoading,
    isConnected,
    refresh: fetchAll,
  };
}
