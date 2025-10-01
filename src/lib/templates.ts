// Template management system
export interface TemplateRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'image' | 'text';
  points?: { x: number; y: number }[]; // For polygon regions
}

export interface Template {
  id: string;
  name: string;
  imageUrl: string;
  createdBy: string; // admin user id
  createdAt: Date;
  regions: TemplateRegion[];
  assignedUsers: string[]; // user ids who can use this template
}

// In-memory template storage (in production, this would be a database)
let templates: Template[] = [];

export function createTemplate(template: Omit<Template, 'id' | 'createdAt'>): Template {
  const newTemplate: Template = {
    ...template,
    id: Date.now().toString(),
    createdAt: new Date()
  };
  templates.push(newTemplate);
  return newTemplate;
}

export function updateTemplate(id: string, updates: Partial<Template>): Template | null {
  const index = templates.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  templates[index] = { ...templates[index], ...updates };
  return templates[index];
}

export function getTemplateById(id: string): Template | null {
  return templates.find(t => t.id === id) || null;
}

export function getAllTemplates(): Template[] {
  return [...templates];
}

export function getTemplatesForUser(userId: string): Template[] {
  return templates.filter(t => t.assignedUsers.includes(userId));
}

export function getTemplatesByAdmin(adminId: string): Template[] {
  return templates.filter(t => t.createdBy === adminId);
}

export function assignTemplateToUser(templateId: string, userId: string): boolean {
  const template = getTemplateById(templateId);
  if (!template) return false;
  
  if (!template.assignedUsers.includes(userId)) {
    template.assignedUsers.push(userId);
  }
  return true;
}

export function unassignTemplateFromUser(templateId: string, userId: string): boolean {
  const template = getTemplateById(templateId);
  if (!template) return false;
  
  template.assignedUsers = template.assignedUsers.filter(id => id !== userId);
  return true;
}

export function deleteTemplate(id: string): boolean {
  const index = templates.findIndex(t => t.id === id);
  if (index === -1) return false;
  
  templates.splice(index, 1);
  return true;
}
