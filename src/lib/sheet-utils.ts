import * as XLSX from 'xlsx';

export interface SheetConfig {
  googleSheetId?: string;
  noOfgoogleSheetRows?: number;
  googleSheetFields?: string[];
  fileName: string;
}

export function downloadGoogleSheet(config: SheetConfig) {
  const {
    googleSheetFields,
    noOfgoogleSheetRows,
    fileName
  } = config;

  // Validate required fields
  if (!googleSheetFields || !noOfgoogleSheetRows) {
    console.error('Missing required fields: googleSheetFields and noOfgoogleSheetRows');
    return;
  }

  // Create worksheet data
  const worksheetData: any[][] = [];
  
  // Add header row
  worksheetData.push(googleSheetFields);
  
  // Add empty rows based on noOfgoogleSheetRows
  for (let i = 0; i < noOfgoogleSheetRows; i++) {
    const row = new Array(googleSheetFields.length).fill('');
    worksheetData.push(row);
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths for better readability
  const columnWidths = googleSheetFields.map(() => ({ wch: 15 }));
  worksheet['!cols'] = columnWidths;
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  // Generate file and trigger download
  const fileName_with_extension = `${fileName ?? "sheet"}.xlsx`;
  XLSX.writeFile(workbook, fileName_with_extension);
}

export function downloadGoogleSheetBlob(config: SheetConfig): Blob {
  const {
    googleSheetFields = ['Column 1', 'Column 2', 'Column 3'],
    noOfgoogleSheetRows = 10
  } = config;

  // Create worksheet data
  const worksheetData: any[][] = [];
  
  // Add header row
  worksheetData.push(googleSheetFields);
  
  // Add empty rows based on noOfgoogleSheetRows
  for (let i = 0; i < noOfgoogleSheetRows; i++) {
    const row = new Array(googleSheetFields.length).fill('');
    worksheetData.push(row);
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths for better readability
  const columnWidths = googleSheetFields.map(() => ({ wch: 15 }));
  worksheet['!cols'] = columnWidths;
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  // Generate blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
} 