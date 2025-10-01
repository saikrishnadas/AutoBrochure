"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authenticateUser, setCurrentUser, testSupabaseConnection, type User } from '@/lib/auth-supabase';
import { AdminOnboarding } from '@/components/admin-onboarding';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    setIsLoading(true);
    
    // Test connection first (for debugging)
    await testSupabaseConnection();
    
    const user = await authenticateUser(username, password);
    
    if (user) {
      setCurrentUser(user);
      toast.success(`Welcome, ${user.name}!`);
      onLogin(user);
    } else {
      toast.error('Invalid username or password');
    }
    
    setIsLoading(false);
  };

  // Removed demo credentials since we're starting with a clean database

  const handleOnboardingComplete = (admin: User) => {
    setCurrentUser(admin);
    toast.success(`Welcome to Auto Brochure, ${admin.name}!`);
    setShowOnboarding(false);
    onLogin(admin);
  };

  if (showOnboarding) {
    return <AdminOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Auto Brochure</CardTitle>
          <p className="text-muted-foreground">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <Button
                variant="default"
                onClick={() => setShowOnboarding(true)}
                className="w-full"
              >
                Create Your Company Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
