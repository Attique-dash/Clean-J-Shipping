import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export function useAuth(redirectToLogin = false) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for user in localStorage
    const userData = localStorage.getItem('user');
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        if (redirectToLogin) {
          router.push('/login');
        }
      }
    } else if (redirectToLogin) {
      router.push('/login');
    }
    
    setLoading(false);
    
    // Check authentication status from server
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        if (res.ok) {
          const userData = await res.json();
          if (userData.user) {
            localStorage.setItem('user', JSON.stringify(userData.user));
            setUser(userData.user);
          } else if (redirectToLogin) {
            router.push('/login');
          }
        } else if (redirectToLogin) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (redirectToLogin) {
          router.push('/login');
        }
      }
    };
    
    checkAuth();
  }, [redirectToLogin, router]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('user');
      setUser(null);
      router.push('/login');
    }
  };

  return { user, loading, logout };
}
