"use client"

import { Button } from '@/components/ui/button';
import { logout, type User } from '@/lib/auth-supabase';
import { LogOut, User as UserIcon, Shield, Crown, Building } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const handleLogout = () => {
    logout();
    onLogout();
  };

  const getRoleIcon = () => {
    switch (user.role) {
      case 'super_admin':
        return <Crown className="h-4 w-4 text-purple-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-green-600" />;
    }
  };

  const getRoleColor = () => {
    switch (user.role) {
      case 'super_admin':
        return 'text-purple-600';
      case 'admin':
        return 'text-blue-600';
      default:
        return 'text-green-600';
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          {/* Company Logo and Name */}
          <div className="flex items-center gap-3">
            {user.company?.logo_url ? (
              <img
                src={user.company.logo_url}
                alt={`${user.company.name} logo`}
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <Building className="h-8 w-8 text-gray-400" />
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {user.company?.name || 'Auto Brochure'}
              </h1>
              {user.role === 'super_admin' && (
                <p className="text-xs text-gray-500">Super Admin Panel</p>
              )}
            </div>
          </div>
          
          {/* User Info */}
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
            {getRoleIcon()}
            <span className="text-sm font-medium text-gray-700">
              {user.name}
            </span>
            <span className={`text-xs capitalize ${getRoleColor()}`}>
              ({user.role.replace('_', ' ')})
            </span>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </nav>
  );
}
