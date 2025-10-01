"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTemplatesForUser, type Template } from '@/lib/templates-supabase';
import { type User } from '@/lib/auth-supabase';
import { ImageReplacer } from '@/components/image-replacer';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';

interface UserDashboardProps {
  user: User;
}

export function UserDashboard({ user }: UserDashboardProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      const userTemplates = await getTemplatesForUser(user.id);
      setTemplates(userTemplates);
      setIsLoading(false);
    };
    loadTemplates();
  }, [user.id]);

  if (selectedTemplate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setSelectedTemplate(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Templates
          </Button>
          <h2 className="text-lg font-semibold">Edit: {selectedTemplate.name}</h2>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Instructions:</strong> Upload your product images and assign them to the marked areas. 
            You can drag images in the preview to adjust positioning before downloading.
          </p>
        </div>

        <ImageReplacer
          templateUrl={selectedTemplate.image_url}
          title={selectedTemplate.name}
          predefinedRegions={selectedTemplate.regions}
          isUserMode={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Assigned Templates</h2>
        <p className="text-muted-foreground">
          Select a template to customize with your images
        </p>
      </div>

      {templates.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <ImageIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Templates Assigned</h3>
            <p className="text-muted-foreground">
              Contact your administrator to get access to templates
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedTemplate(template)}
            >
              <CardHeader className="p-0">
                <div className="relative">
                  <img
                    src={template.image_url}
                    alt={template.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                    <Button size="sm" className="bg-white text-black hover:bg-gray-100">
                      Customize
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg mb-2">{template.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {template.regions?.length || 0} customizable areas
                </p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(template.created_at).toLocaleDateString()}
                  </span>
                  <Button size="sm" variant="outline">
                    Start Editing
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
