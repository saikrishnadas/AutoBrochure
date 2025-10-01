"use client"

import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/login-form';
import { Navbar } from '@/components/navbar';
import { AdminDashboard } from '@/components/admin-dashboard';
import { UserDashboard } from '@/components/user-dashboard';
import { getCurrentUser, isAdmin, type User } from '@/lib/auth-supabase';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Delay to avoid hydration mismatch
    const timer = setTimeout(() => {
      const user = getCurrentUser();
      setCurrentUser(user);
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={currentUser} onLogout={handleLogout} />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {isAdmin(currentUser) ? (
          <AdminDashboard user={currentUser} />
        ) : (
          <UserDashboard user={currentUser} />
        )}
      </main>
    </div>
  );
}
