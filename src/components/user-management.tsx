"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  User as UserIcon, 
  Mail, 
  Calendar, 
  Shield, 
  Trash2,
  Edit,
  X,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getAllUsers, 
  createUser, 
  type User 
} from '@/lib/auth-supabase';

interface UserManagementProps {
  currentUser: User;
}

interface CreateUserForm {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'user';
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, [currentUser.company_id]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const companyUsers = await getAllUsers(currentUser.company_id);
      setUsers(companyUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    // Validation
    if (!createForm.name.trim() || !createForm.username.trim() || !createForm.password.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (createForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Check if username already exists
    if (users.some(user => user.username === createForm.username)) {
      toast.error('Username already exists');
      return;
    }

    if (!currentUser.company_id) {
      toast.error('No company associated with your account');
      return;
    }

    setIsCreating(true);
    const toastId = toast.loading('Creating user...');

    try {
      const newUser = await createUser({
        username: createForm.username,
        password: createForm.password,
        name: createForm.name,
        email: createForm.email || undefined,
        role: createForm.role,
        company_id: currentUser.company_id,
        created_by: currentUser.id
      });

      if (newUser) {
        toast.success(`${createForm.role === 'admin' ? 'Admin' : 'User'} created successfully!`, { id: toastId });
        setUsers(prev => [...prev, newUser]);
        setShowCreateForm(false);
        setCreateForm({
          name: '',
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'user'
        });
      } else {
        toast.error('Failed to create user', { id: toastId });
      }
    } catch (error) {
      console.error('Create user error:', error);
      toast.error('Failed to create user', { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderCreateUserForm = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New User
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateForm(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Enter full name"
              value={createForm.name}
              onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={createForm.username}
              onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email (optional)"
              value={createForm.email}
              onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={createForm.role}
              onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={createForm.password}
              onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm password"
              value={createForm.confirmPassword}
              onChange={(e) => setCreateForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </div>
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => setShowCreateForm(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateUser}
            disabled={isCreating}
            className="flex-1"
          >
            {isCreating ? 'Creating...' : 'Create User'}
            <Check className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderUserCard = (user: User) => (
    <Card key={user.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{user.name}</h3>
              <p className="text-sm text-gray-600">@{user.username}</p>
              {user.email && (
                <div className="flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3 text-gray-400" />
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Badge className={getRoleBadgeColor(user.role)}>
              {user.role === 'admin' ? (
                <>
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </>
              ) : (
                <>
                  <UserIcon className="h-3 w-3 mr-1" />
                  User
                </>
              )}
            </Badge>
            
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              {new Date(user.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        
        {user.created_by && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Created by: {user.created_by === currentUser.id ? 'You' : 'Another admin'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">User Management</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-600">Manage users in your organization</p>
        </div>
        
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {showCreateForm && renderCreateUserForm()}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Company Users ({users.length})
          </h3>
        </div>

        {users.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <UserIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Users Yet</h3>
              <p className="text-gray-600 mb-4">
                Start by creating your first user account
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First User
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(renderUserCard)}
          </div>
        )}
      </div>
    </div>
  );
}
