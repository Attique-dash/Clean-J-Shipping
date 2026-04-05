"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
      
      // Check for status changes
      if (previousStatusRef.current && trackingData.status !== previousStatusRef.current) {
        onStatusChange?.(trackingData.status, previousStatusRef.current);
        addNotification("Package Update: Status changed to: " + trackingData.status, "info");
      }
      
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
  }, [trackingNumber, onUpdate, onStatusChange, addNotification]);

  // Initial fetch
  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  // Polling for real-time updates (WebSocket alternative for serverless environments)
  useEffect(() => {
    if (!enablePolling || !trackingNumber) return;

    // Always use polling on Vercel (serverless doesn't support WebSockets)
    setIsLive(true);
    
    pollingRef.current = setInterval(() => {
      fetchTrackingData();
    }, pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [enablePolling, trackingNumber, pollingInterval, fetchTrackingData]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchTrackingData();
    addNotification("Tracking data has been updated", "success");
  }, [fetchTrackingData, addNotification]);

  return {
    data,
    isLoading,
    error,
    isLive: enablePolling, // Always show as "live" when polling is enabled
    isConnected: enablePolling, // Treat polling as "connected"
    refresh,
    lastUpdate: lastUpdateRef.current,
  };
}

// Hook for tracking multiple packages
export function useRealTimeTrackingList(trackingNumbers: string[]) {
  const [packages, setPackages] = useState<Record<string, TrackingData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Poll for updates every 30 seconds
    pollingRef.current = setInterval(() => {
      fetchAll();
    }, 30000);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchAll]);

  return {
    packages,
    isLoading,
    isConnected: true, // Always connected via polling
    refresh: fetchAll,
  };
}
