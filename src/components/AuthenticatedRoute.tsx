// src/components/AuthenticatedRoute.tsx
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthenticatedRoute({ children, requiredRoles = [] }: { 
  children: React.ReactNode;
  requiredRoles?: string[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, redirect to login
        router.push('/login');
      } else if (requiredRoles.length > 0 && !requiredRoles.some(role => user.roles?.includes(role))) {
        // Logged in but not authorized, redirect to dashboard
        router.push('/dashboard');
      } else {
        setAuthorized(true);
      }
    }
  }, [user, loading, router, requiredRoles]);

  if (loading || !authorized) {
    return <div>Loading...</div>; // Or a loading spinner
  }

  return <>{children}</>;
}