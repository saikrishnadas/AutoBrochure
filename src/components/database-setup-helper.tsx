"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Database, CheckCircle, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { testCompaniesTable, testUsersTableSchema } from '@/lib/auth-supabase';

interface DatabaseSetupHelperProps {
  onSetupComplete: () => void;
}

export function DatabaseSetupHelper({ onSetupComplete }: DatabaseSetupHelperProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [setupStatus, setSetupStatus] = useState<'checking' | 'missing' | 'ready'>('missing');

  const checkDatabaseSetup = async () => {
    setIsChecking(true);
    setSetupStatus('checking');
    
    try {
      const companiesReady = await testCompaniesTable();
      const usersReady = await testUsersTableSchema();
      
      if (companiesReady && usersReady) {
        setSetupStatus('ready');
        toast.success('Database is properly configured!');
        setTimeout(() => {
          onSetupComplete();
        }, 1500);
      } else {
        setSetupStatus('missing');
        if (!companiesReady) {
          toast.error('Companies table missing - run the database schema');
        } else if (!usersReady) {
          toast.error('Users table needs updating - run the safe schema update');
        }
      }
    } catch (error) {
      setSetupStatus('missing');
      toast.error('Failed to check database setup');
    } finally {
      setIsChecking(false);
    }
  };

  const copySchemaPath = () => {
    navigator.clipboard.writeText('sql/safe-schema-update.sql');
    toast.success('Safe schema path copied to clipboard');
  };

  if (setupStatus === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <CardTitle className="text-2xl text-green-800">Database Ready!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700 mb-4">
              Your database is properly configured for multi-tenant features.
            </p>
            <p className="text-sm text-green-600">
              Redirecting to onboarding...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <Database className="h-16 w-16 mx-auto text-orange-600 mb-4" />
          <CardTitle className="text-2xl text-orange-800">Database Setup Required</CardTitle>
          <p className="text-orange-700">
            The multi-tenant features require an updated database schema
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-orange-800">Setup Instructions</h3>
                <ol className="text-sm text-orange-700 space-y-1 list-decimal list-inside">
                  <li>Go to your Supabase Dashboard</li>
                  <li>Navigate to SQL Editor</li>
                  <li>Create a new query</li>
                  <li>Copy and paste the contents of <code className="bg-orange-100 px-1 rounded">sql/safe-schema-update.sql</code></li>
                  <li>Run the query to update the database schema</li>
                  <li>This will add missing columns to the users table</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copySchemaPath}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Schema Path
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Supabase Dashboard
              </Button>
            </div>

            <div className="text-center">
              <Button
                onClick={checkDatabaseSetup}
                disabled={isChecking}
                className="w-full"
              >
                {isChecking ? 'Checking Database...' : 'Check Database Setup'}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Click after running the SQL schema
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">What this creates:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Companies table</strong> - For multi-tenant support</li>
              <li>• <strong>Updated users table</strong> - With company relationships</li>
              <li>• <strong>Updated templates table</strong> - With company scoping</li>
              <li>• <strong>Storage buckets</strong> - For company logos</li>
              <li>• <strong>Clean database</strong> - Ready for your first company</li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need help? Check the{' '}
              <code className="bg-gray-100 px-1 rounded">DATABASE_SETUP.md</code>{' '}
              file for detailed instructions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
