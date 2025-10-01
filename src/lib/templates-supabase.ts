import { supabase } from './supabase'

export interface TemplateRegion {
  id: string
  template_id: string
  type: 'image' | 'text'
  shape: 'rectangle' | 'polygon'
  coordinates: {
    x?: number
    y?: number
    width?: number
    height?: number
    points?: { x: number; y: number }[]
  }
}

export interface Template {
  id: string
  name: string
  image_url: string
  image_path: string
  company_id: string
  created_by: string
  created_at: string
  regions?: TemplateRegion[]
  assigned_users?: string[]
}

// Upload template image to Supabase Storage
export async function uploadTemplateImage(file: File, templateName: string): Promise<{ path: string; url: string } | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${templateName.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('templates')
      .upload(fileName, file)

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('templates')
      .getPublicUrl(data.path)

    return {
      path: data.path,
      url: publicUrl
    }
  } catch (error) {
    console.error('Upload error:', error)
    return null
  }
}

// Create template in database
export async function createTemplate(template: {
  name: string
  image_url: string
  image_path: string
  company_id: string
  created_by: string
}): Promise<Template | null> {
  try {
    const { data, error } = await supabase
      .from('templates')
      .insert([template])
      .select()
      .single()

    if (error) {
      console.error('Create template error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Create template error:', error)
    return null
  }
}

// Save template regions (annotations)
export async function saveTemplateRegions(templateId: string, regions: any[]): Promise<boolean> {
  try {
    // First, delete existing regions
    await supabase
      .from('regions')
      .delete()
      .eq('template_id', templateId)

    // Then insert new regions
    const regionData = regions.map(region => ({
      template_id: templateId,
      type: region.type,
      shape: region.points ? 'polygon' : 'rectangle',
      coordinates: region.points 
        ? { points: region.points }
        : { x: region.x, y: region.y, width: region.width, height: region.height }
    }))

    const { error } = await supabase
      .from('regions')
      .insert(regionData)

    if (error) {
      console.error('Save regions error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Save regions error:', error)
    return false
  }
}

// Get template by ID with regions
export async function getTemplateById(id: string): Promise<Template | null> {
  try {
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single()

    if (templateError || !template) {
      return null
    }

    const { data: regions, error: regionsError } = await supabase
      .from('regions')
      .select('*')
      .eq('template_id', id)

    if (regionsError) {
      console.error('Get regions error:', regionsError)
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from('template_assignments')
      .select('user_id')
      .eq('template_id', id)

    return {
      ...template,
      regions: regions || [],
      assigned_users: assignments?.map(a => a.user_id) || []
    }
  } catch (error) {
    console.error('Get template error:', error)
    return null
  }
}

// Get all templates
export async function getAllTemplates(): Promise<Template[]> {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select(`
        *,
        regions(*),
        template_assignments(user_id)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get templates error:', error)
      return []
    }

    return data?.map(template => ({
      ...template,
      assigned_users: template.template_assignments?.map((a: any) => a.user_id) || []
    })) || []
  } catch (error) {
    console.error('Get templates error:', error)
    return []
  }
}

// Get templates created by admin (filtered by company)
export async function getTemplatesByAdmin(adminId: string, companyId?: string): Promise<Template[]> {
  try {
    let query = supabase
      .from('templates')
      .select(`
        *,
        regions(*),
        template_assignments(user_id)
      `)
      .eq('created_by', adminId)
      .order('created_at', { ascending: false })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Get admin templates error:', error)
      return []
    }

    return data?.map(template => ({
      ...template,
      assigned_users: template.template_assignments?.map((a: any) => a.user_id) || []
    })) || []
  } catch (error) {
    console.error('Get admin templates error:', error)
    return []
  }
}

// Get templates assigned to user
export async function getTemplatesForUser(userId: string): Promise<Template[]> {
  try {
    const { data, error } = await supabase
      .from('template_assignments')
      .select(`
        templates(
          *,
          regions(*)
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Get user templates error:', error)
      return []
    }

    return data?.map((assignment: any) => assignment.templates) || []
  } catch (error) {
    console.error('Get user templates error:', error)
    return []
  }
}

// Assign template to user
export async function assignTemplateToUser(templateId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('template_assignments')
      .insert([{ template_id: templateId, user_id: userId }])

    if (error) {
      console.error('Assign template error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Assign template error:', error)
    return false
  }
}

// Unassign template from user
export async function unassignTemplateFromUser(templateId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('template_assignments')
      .delete()
      .eq('template_id', templateId)
      .eq('user_id', userId)

    if (error) {
      console.error('Unassign template error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Unassign template error:', error)
    return false
  }
}

// Delete template
export async function deleteTemplate(id: string): Promise<boolean> {
  try {
    // Delete from storage first
    const template = await getTemplateById(id)
    if (template?.image_path) {
      await supabase.storage
        .from('templates')
        .remove([template.image_path])
    }

    // Delete from database (cascades to regions and assignments)
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete template error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete template error:', error)
    return false
  }
}
