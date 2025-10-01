import * as XLSX from 'xlsx';
import { 
  readGoogleSheetsPublic, 
  isValidGoogleSheetsUrl
} from './google-sheets';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: unknown[][];
  actualColumns?: string[];
  actualRowCount?: number;
  productData?: ProductData[];
}

export interface ProductData {
  id: string;
  name: string;
  image: string;
}

export interface SheetValidationConfig {
  expectedColumns: string[];
  expectedMinRows: number;
  expectedMaxRows?: number;
}

export function validateUploadedSheet(
  file: File,
  config: SheetValidationConfig
): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays
        const sheetData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '' 
        });
        
        const errors: string[] = [];
        
        // Check if sheet has data
        if (!sheetData || sheetData.length === 0) {
          errors.push("The uploaded sheet is empty.");
          resolve({ isValid: false, errors });
          return;
        }
        
        // Get actual columns (first row)
        const actualColumns = sheetData[0] || [];
        const actualRowCount = sheetData.length - 1; // Subtract header row
        
        // Validate columns
        const expectedColumns = config.expectedColumns;
        
        // Check if all expected columns are present
        const missingColumns = expectedColumns.filter(
          expectedCol => !actualColumns.some(actualCol => 
            actualCol?.toString().trim().toLowerCase() === expectedCol.toLowerCase()
          )
        );
        
        if (missingColumns.length > 0) {
          errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
        }
        
        // Check for extra columns (optional warning)
        const extraColumns = actualColumns.filter(
          actualCol => actualCol && !expectedColumns.some(expectedCol =>
            actualCol.toString().trim().toLowerCase() === expectedCol.toLowerCase()
          )
        );
        
        if (extraColumns.length > 0) {
          errors.push(`Unexpected columns found: ${extraColumns.join(', ')}`);
        }
        
        // Validate row count
        if (actualRowCount < config.expectedMinRows) {
          errors.push(`Sheet must have at least ${config.expectedMinRows} data rows. Found: ${actualRowCount}`);
        }
        
        if (config.expectedMaxRows && actualRowCount > config.expectedMaxRows) {
          errors.push(`Sheet has too many rows. Maximum allowed: ${config.expectedMaxRows}. Found: ${actualRowCount}`);
        }
        
        // Check if columns are in correct order (optional)
        const columnOrderErrors: string[] = [];
        expectedColumns.forEach((expectedCol, index) => {
          const actualCol = actualColumns[index];
          if (actualCol && actualCol.toString().trim().toLowerCase() !== expectedCol.toLowerCase()) {
            columnOrderErrors.push(`Column ${index + 1} should be "${expectedCol}" but found "${actualCol}"`);
          }
        });
        
        if (columnOrderErrors.length > 0) {
          errors.push("Column order mismatch: " + columnOrderErrors.join(', '));
        }
        
        resolve({
          isValid: errors.length === 0,
          errors,
          data: sheetData,
          actualColumns: actualColumns.map(col => col?.toString() || ''),
          actualRowCount
        });
        
      } catch (error) {
        resolve({
          isValid: false,
          errors: [`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: ['Error reading the uploaded file. Please try again.']
      });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  
  return errors.length === 1 
    ? errors[0]
    : `Please fix the following issues:\n• ${errors.join('\n• ')}`;
}

// Validate product sheet with name, id, image columns (max 5 rows)
export function validateProductSheet(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays
        const sheetData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '' 
        });
        
        const errors: string[] = [];
        
        // Check if sheet has data
        if (!sheetData || sheetData.length === 0) {
          errors.push("The uploaded sheet is empty.");
          resolve({ isValid: false, errors });
          return;
        }
        
        // Get header row
        const headerRow = sheetData[0] || [];
        const dataRows = sheetData.slice(1);
        
        // Required columns
        const requiredColumns = ['name', 'id', 'image'];
        const columnIndices: { [key: string]: number } = {};
        
        // Find column indices (case-insensitive)
        requiredColumns.forEach(col => {
          const index = headerRow.findIndex((header: any) => 
            header?.toString().toLowerCase().trim() === col.toLowerCase()
          );
          if (index === -1) {
            errors.push(`Missing required column: "${col}"`);
          } else {
            columnIndices[col] = index;
          }
        });
        
        // Check row count (max 5 rows)
        if (dataRows.length === 0) {
          errors.push("Sheet must contain at least 1 data row");
        } else if (dataRows.length > 5) {
          errors.push(`Sheet can contain maximum 5 rows. Found: ${dataRows.length}`);
        }
        
        // If we have errors so far, return early
        if (errors.length > 0) {
          resolve({ isValid: false, errors });
          return;
        }
        
        // Extract and validate product data
        const productData: ProductData[] = [];
        
        dataRows.forEach((row: any[], rowIndex: number) => {
          const rowNum = rowIndex + 2; // +2 because we start from row 2 (after header)
          
          const id = row[columnIndices.id]?.toString().trim();
          const name = row[columnIndices.name]?.toString().trim();
          const image = row[columnIndices.image]?.toString().trim();
          
          // Validate required fields
          if (!id) {
            errors.push(`Row ${rowNum}: ID is required`);
          }
          if (!name) {
            errors.push(`Row ${rowNum}: Name is required`);
          }
          if (!image) {
            errors.push(`Row ${rowNum}: Image URL is required`);
          }
          
          // Validate image URL format
          if (image && !isValidImageUrl(image)) {
            errors.push(`Row ${rowNum}: Invalid image URL format`);
          }
          
          // Add to product data if valid
          if (id && name && image) {
            productData.push({
              id,
              name,
              image: convertGoogleDriveUrl(image)
            });
          }
        });
        
        resolve({
          isValid: errors.length === 0,
          errors,
          data: sheetData,
          actualColumns: headerRow.map(col => col?.toString() || ''),
          actualRowCount: dataRows.length,
          productData: errors.length === 0 ? productData : undefined
        });
        
      } catch (error) {
        resolve({
          isValid: false,
          errors: [`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: ['Error reading the uploaded file. Please try again.']
      });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// Validate if string is a valid image URL
function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// Convert Google Drive share URLs to direct image URLs
function convertGoogleDriveUrl(url: string): string {
  // Check if it's a Google Drive share link
  const driveShareMatch = url.match(/https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/);
  if (driveShareMatch) {
    const fileId = driveShareMatch[1];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  
  // If it's already a direct link or different format, return as is
  return url;
}

// Validate product sheet from Google Sheets URL
export async function validateProductSheetFromUrl(url: string): Promise<ValidationResult> {
  try {
    // Validate URL format
    if (!isValidGoogleSheetsUrl(url)) {
      return {
        isValid: false,
        errors: ['Invalid Google Sheets URL format. Please provide a valid Google Sheets link.']
      };
    }

    // Use our API to read and validate the Google Sheets data
    const result = await readGoogleSheetsPublic(url);
    
    return {
      isValid: result.isValid,
      errors: result.errors,
      data: result.data,
      actualColumns: result.actualColumns,
      actualRowCount: result.actualRowCount,
      productData: result.productData
    };

  } catch (error) {
    console.error('Error validating Google Sheets URL:', error);
    return {
      isValid: false,
      errors: [`Failed to read Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
} 