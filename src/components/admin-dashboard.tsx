"use client"

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Plus, Settings, Users } from 'lucide-react';
import { toast } from 'sonner';
import { uploadTemplateImage, createTemplate, getTemplatesByAdmin, assignTemplateToUser, unassignTemplateFromUser, saveTemplateRegions, type Template } from '@/lib/templates-supabase';
import { getAllUsers, type User } from '@/lib/auth-supabase';
import { ImageReplacer } from '@/components/image-replacer';
import { UserManagement } from '@/components/user-management';

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'create' | 'assign' | 'users'>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, [user.id]);

  const loadTemplates = async () => {
    setIsLoading(true);
    const adminTemplates = await getTemplatesByAdmin(user.id, user.company_id);
    setTemplates(adminTemplates);
    setIsLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const templateName = prompt('Enter template name:');
    if (!templateName) return;

    const toastId = toast.loading('Uploading template...');

    try {
      // Upload image to Supabase Storage
      const uploadResult = await uploadTemplateImage(file, templateName);
      if (!uploadResult) {
        toast.error('Failed to upload image', { id: toastId });
        return;
      }

      // Create template in database
      const newTemplate = await createTemplate({
        name: templateName,
        image_url: uploadResult.url,
        image_path: uploadResult.path,
        company_id: user.company_id!,
        created_by: user.id
      });

      if (!newTemplate) {
        toast.error('Failed to create template', { id: toastId });
        return;
      }

      toast.success('Template uploaded! Now annotate the areas.', { id: toastId });
      setTemplates(prev => [...prev, newTemplate]);
      setSelectedTemplate(newTemplate);
      setIsCreatingTemplate(true);
    } catch (error) {
      toast.error('Failed to create template', { id: toastId });
      console.error('Upload error:', error);
    }
  };

  const handleSaveTemplate = async (regions: any[]) => {
    if (!selectedTemplate) return;

    const toastId = toast.loading('Saving template...');
    
    try {
      const success = await saveTemplateRegions(selectedTemplate.id, regions);
      
      if (success) {
        toast.success('Template saved successfully!', { id: toastId });
        setIsCreatingTemplate(false);
        loadTemplates(); // Reload templates to get updated data
      } else {
        toast.error('Failed to save template', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to save template', { id: toastId });
      console.error('Save error:', error);
    }
  };

  const [users, setUsers] = useState<User[]>([]);

  // Load users for template assignment
  useEffect(() => {
    const loadUsers = async () => {
      const allUsers = await getAllUsers(user.company_id);
      setUsers(allUsers);
    };
    loadUsers();
  }, [user.company_id]);

  const renderTemplatesList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Templates</h2>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Template
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="p-4">
              <img
                src={template.image_url}
                alt={template.name}
                className="w-full h-32 object-cover rounded"
              />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <h3 className="font-medium">{template.name}</h3>
              <p className="text-sm text-muted-foreground">
                {template.regions?.length || 0} regions • {template.assigned_users?.length || 0} users
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.log('🔍 Editing template with regions:', template.regions);
                    setSelectedTemplate(template);
                    setIsCreatingTemplate(true);
                  }}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderAssignments = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Assign Templates to Users</h2>
      
      {templates.map(template => (
        <Card key={template.id}>
          <CardHeader>
            <CardTitle className="text-base">{template.name}</CardTitle>
          </CardHeader>
          <CardContent>
                          <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select users who can use this template:
                </p>
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between">
                    <span className="text-sm">{u.name} ({u.username})</span>
                    <Button
                      size="sm"
                      variant={template.assigned_users?.includes(u.id) ? "default" : "outline"}
                      onClick={async () => {
                        if (template.assigned_users?.includes(u.id)) {
                          await unassignTemplateFromUser(template.id, u.id);
                        } else {
                          await assignTemplateToUser(template.id, u.id);
                        }
                        loadTemplates(); // Reload to get updated assignments
                      }}
                    >
                      {template.assigned_users?.includes(u.id) ? 'Assigned' : 'Assign'}
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isCreatingTemplate && selectedTemplate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setIsCreatingTemplate(false)}
          >
            ← Back to Templates
          </Button>
          <h2 className="text-lg font-semibold">Annotate: {selectedTemplate.name}</h2>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Instructions:</strong> Use the annotation tools below to mark areas where users can place images or text. 
            Once done, the template will be saved automatically.
          </p>
        </div>

        <ImageReplacer
          templateUrl={selectedTemplate.image_url}
          title={selectedTemplate.name}
          onSave={handleSaveTemplate}
          predefinedRegions={selectedTemplate.regions}
          isAdminMode={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'templates' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('templates')}
        >
          My Templates
        </Button>
        <Button
          variant={activeTab === 'assign' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('assign')}
        >
          <Users className="h-4 w-4 mr-1" />
          Assign Templates
        </Button>
        <Button
          variant={activeTab === 'users' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('users')}
        >
          <Users className="h-4 w-4 mr-1" />
          Manage Users
        </Button>
      </div>

      {activeTab === 'templates' && renderTemplatesList()}
      {activeTab === 'assign' && renderAssignments()}
      {activeTab === 'users' && <UserManagement currentUser={user} />}
    </div>
  );
}
