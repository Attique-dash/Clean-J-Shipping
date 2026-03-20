// src/components/PayPalProvider.tsx
"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

interface PayPalProviderProps {
  children: React.ReactNode;
}

export function PayPalProvider({ children }: PayPalProviderProps) {
  const [paypalConfig, setPaypalConfig] = useState<{
    scriptUrl: string;
    environment: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayPalConfig = async () => {
      try {
        const response = await fetch("/api/admin/paypal/config");
        if (response.ok) {
          const config = await response.json();
          setPaypalConfig({
            scriptUrl: config.scriptUrl,
            environment: config.environment,
          });
        } else {
          setError("PayPal is not configured");
        }
      } catch (err) {
        setError("Failed to load PayPal configuration");
        console.error("PayPal config error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayPalConfig();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading PayPal...</span>
      </div>
    );
  }

  if (error || !paypalConfig) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>PayPal payment is currently unavailable.</p>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
        "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
        currency: "JMD",
        intent: "capture",
        "disable-funding": "credit,card",
        "merchant-id": process.env.NEXT_PUBLIC_PAYPAL_MERCHANT_ID || "",
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}

interface PayPalPaymentButtonProps {
  amount: number;
  currency?: string;
  description?: string;
  trackingNumber?: string;
  items?: Array<{
    trackingNumber: string;
    invoiceNumber?: string;
    amount: number;
    description?: string;
  }>;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PayPalPaymentButton({
  amount,
  currency = "JMD",
  description = "Payment",
  trackingNumber,
  items,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  className = "",
}: PayPalPaymentButtonProps) {
  const [processing, setProcessing] = useState(false);

  const createOrder = async () => {
    try {
      setProcessing(true);
      
      const response = await fetch("/api/customer/payments/create-paypal-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency,
          description,
          trackingNumber,
          items,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create PayPal order");
      }

      return data.orderId;
    } catch (error) {
      console.error("Create order error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create payment order");
      onError?.(error);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const onApprove = async (data: any) => {
    try {
      setProcessing(true);
      
      const response = await fetch("/api/customer/payments/capture-paypal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: data.orderID,
        }),
      });

      const captureData = await response.json();

      if (!response.ok) {
        throw new Error(captureData.error || "Failed to capture payment");
      }

      toast.success("Payment completed successfully!");
      onSuccess?.(captureData);
    } catch (error) {
      console.error("Capture payment error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to complete payment");
      onError?.(error);
    } finally {
      setProcessing(false);
    }
  };

  const onErrorHandler = (err: any) => {
    console.error("PayPal button error:", err);
    toast.error("An error occurred with PayPal. Please try again.");
    onError?.(err);
  };

  const onCancelHandler = () => {
    toast.info("Payment was cancelled.");
    onCancel?.();
  };

  if (processing) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Processing...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <PayPalButtons
        style={{
          layout: "vertical",
          color: "blue",
          shape: "rect",
          label: "pay",
          height: 40,
        }}
        disabled={disabled}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onErrorHandler}
        onCancel={onCancelHandler}
        forceReRender={[amount, currency, disabled]}
      />
    </div>
  );
}

// Hook for checking PayPal availability
export function usePayPalConfig() {
  const [config, setConfig] = useState<{
    configured: boolean;
    environment?: string;
    supportedCurrencies: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/admin/paypal/config");
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        } else {
          setConfig({
            configured: false,
            supportedCurrencies: [],
          });
        }
      } catch (error) {
        console.error("Failed to fetch PayPal config:", error);
        setConfig({
          configured: false,
          supportedCurrencies: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading };
}
