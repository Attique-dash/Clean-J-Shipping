// src/pages/_app.tsx
import { SessionProvider } from 'next-auth/react';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { AppProps } from 'next/app';
import '../styles/globals.css';

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <ErrorBoundary>
      <SessionProvider session={session}>
        <AuthProvider>
          <WebSocketProvider>
            <NotificationProvider>
              <Component {...pageProps} />
            </NotificationProvider>
          </WebSocketProvider>
        </AuthProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}

export default MyApp;