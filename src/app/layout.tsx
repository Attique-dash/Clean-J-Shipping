// src/app/layout.tsx
'use client';

import { useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

// Remove the metadata export since we're using 'use client'
// Move metadata to a separate metadata.ts file or handle it differently

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Safari detection and fix
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isSafari) {
      console.log('Safari detected - applying fixes');
      
      // Force style recalculation
      document.documentElement.style.display = 'none';
      void document.documentElement.offsetHeight; // Trigger reflow
      document.documentElement.style.display = '';
      
      // Force repaint after a short delay
      setTimeout(() => {
        document.body.style.display = 'none';
        void document.body.offsetHeight;
        document.body.style.display = '';
      }, 100);
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Clean J Shipping - Logistics & Delivery</title>
        <meta name="description" content="Manage your shipments, track deliveries, and streamline your logistics operations" />
        
        {/* Safari-specific meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* Force color profile for Safari */}
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#1A366D" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}