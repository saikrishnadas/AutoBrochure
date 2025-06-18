import * as XLSX from 'xlsx';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: any[][];
  actualColumns?: string[];
  actualRowCount?: number;
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
        const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
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