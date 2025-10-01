"use client"

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Building, User, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createCompany, uploadCompanyLogo, createUser, testCompaniesTable, testUsersTableSchema, type Company, type User } from '@/lib/auth-supabase';
import { DatabaseSetupHelper } from '@/components/database-setup-helper';

interface AdminOnboardingProps {
  onComplete: (admin: User) => void;
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: "Company Information",
    description: "Tell us about your company"
  },
  {
    id: 2,
    title: "Company Logo",
    description: "Upload your company logo"
  },
  {
    id: 3,
    title: "Admin Account",
    description: "Create your admin account"
  }
];

export function AdminOnboarding({ onComplete }: AdminOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Company data
  const [companyName, setCompanyName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  // Admin data
  const [adminData, setAdminData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Created company (to pass to admin creation)
  const [createdCompany, setCreatedCompany] = useState<Company | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStep1Next = () => {
    if (!companyName.trim()) {
      toast.error('Please enter your company name');
      return;
    }
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    // Logo is optional, can proceed without it
    setCurrentStep(3);
  };

  const handleStep3Complete = async () => {
    // Validate admin data
    if (!adminData.name.trim() || !adminData.username.trim() || !adminData.password.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (adminData.password !== adminData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (adminData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Setting up your account...');

    try {
      // First test if the companies table exists
      const tableExists = await testCompaniesTable();
      if (!tableExists) {
        toast.error('Database setup required', { id: toastId });
        setShowDatabaseSetup(true);
        return;
      }

      // Test if users table has been updated with new columns
      const usersSchemaReady = await testUsersTableSchema();
      if (!usersSchemaReady) {
        toast.error('Users table needs to be updated. Please run the database schema update.', { id: toastId });
        setShowDatabaseSetup(true);
        return;
      }
      // Step 1: Upload logo if provided
      let logoUrl = '';
      let logoPath = '';
      
      if (logoFile) {
        const uploadResult = await uploadCompanyLogo(logoFile, companyName);
        if (uploadResult) {
          logoUrl = uploadResult.url;
          logoPath = uploadResult.path;
        }
      }

      // Step 2: Create company
      const company = await createCompany({
        name: companyName,
        logo_url: logoUrl || undefined,
        logo_path: logoPath || undefined
      });

      if (!company) {
        toast.error('Failed to create company', { id: toastId });
        return;
      }

      setCreatedCompany(company);

      // Step 3: Create admin user
      const admin = await createUser({
        username: adminData.username,
        password: adminData.password,
        name: adminData.name,
        email: adminData.email || undefined,
        role: 'admin',
        company_id: company.id,
        created_by: null // Self-created (no creator)
      });

      if (!admin) {
        toast.error('Failed to create admin account', { id: toastId });
        return;
      }

      toast.success('Account created successfully! Welcome to Auto Brochure!', { id: toastId });
      onComplete(admin);
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Failed to complete setup. Please try again.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseSetupComplete = () => {
    setShowDatabaseSetup(false);
    toast.success('Database setup completed! You can now create your admin account.');
  };

  if (showDatabaseSetup) {
    return <DatabaseSetupHelper onSetupComplete={handleDatabaseSetupComplete} />;
  }

  const renderStep1 = () => (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Building className="h-12 w-12 mx-auto text-blue-600 mb-4" />
        <CardTitle className="text-2xl">Company Information</CardTitle>
        <p className="text-muted-foreground">Let's start by setting up your company profile</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            placeholder="Enter your company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <Button onClick={handleStep1Next} className="w-full">
          Next <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Upload className="h-12 w-12 mx-auto text-blue-600 mb-4" />
        <CardTitle className="text-2xl">Company Logo</CardTitle>
        <p className="text-muted-foreground">Upload your company logo (optional)</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {logoPreview ? (
            <div className="text-center">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-24 w-24 mx-auto object-contain border rounded-lg"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Logo
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Click to upload logo</p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
            Back
          </Button>
          <Button onClick={handleStep2Next} className="flex-1">
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <User className="h-12 w-12 mx-auto text-blue-600 mb-4" />
        <CardTitle className="text-2xl">Admin Account</CardTitle>
        <p className="text-muted-foreground">Create your administrator account</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminName">Full Name *</Label>
            <Input
              id="adminName"
              placeholder="Enter your full name"
              value={adminData.name}
              onChange={(e) => setAdminData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="adminUsername">Username *</Label>
            <Input
              id="adminUsername"
              placeholder="Choose a username"
              value={adminData.username}
              onChange={(e) => setAdminData(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email</Label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="Enter your email (optional)"
              value={adminData.email}
              onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Password *</Label>
            <Input
              id="adminPassword"
              type="password"
              placeholder="Choose a password"
              value={adminData.password}
              onChange={(e) => setAdminData(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={adminData.confirmPassword}
              onChange={(e) => setAdminData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
            Back
          </Button>
          <Button 
            onClick={handleStep3Complete} 
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Complete Setup'}
            <CheckCircle className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentStep >= step.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {currentStep > step.id ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-medium text-gray-900">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    w-16 h-0.5 mx-4 mt-[-20px]
                    ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex justify-center">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>
      </div>
    </div>
  );
}
