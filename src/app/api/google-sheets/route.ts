import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'Google Sheets URL is required' }, { status: 400 });
    }

    // Extract spreadsheet ID from URL
    const spreadsheetId = extractSpreadsheetId(url);
    if (!spreadsheetId) {
      return NextResponse.json({ 
        error: 'Could not extract spreadsheet ID from the URL. Please check the URL format.' 
      }, { status: 400 });
    }

    // Extract GID (sheet ID) from URL
    const gid = extractGid(url);

    // Use the public CSV export URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    
    console.log('Fetching Google Sheets data from:', csvUrl);
    
    // Try fetching with different approaches
    let response;
    let errorMessage = '';
    
    try {
      // First attempt: Standard fetch
      response = await fetch(csvUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AutoBrochure/1.0)',
        },
      });
      
      if (!response.ok) {
        errorMessage = `${response.status} ${response.statusText}`;
        console.log('First attempt failed:', errorMessage);
        
        // Second attempt: Try with different URL format
        const alternativeUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&id=${spreadsheetId}&gid=${gid}`;
        console.log('Trying alternative URL:', alternativeUrl);
        
        response = await fetch(alternativeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AutoBrochure/1.0)',
          },
        });
        
        if (!response.ok) {
          errorMessage += ` | Alternative: ${response.status} ${response.statusText}`;
          console.log('Second attempt failed:', response.status, response.statusText);
          
          // Third attempt: Try the published web URL approach
          const publishedUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
          console.log('Trying published URL:', publishedUrl);
          
          response = await fetch(publishedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AutoBrochure/1.0)',
            },
          });
          
          if (!response.ok) {
            errorMessage += ` | Published: ${response.status} ${response.statusText}`;
            console.log('Third attempt failed:', response.status, response.statusText);
            
            // Fourth attempt: Try with CORS proxy as last resort
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;
            console.log('Trying CORS proxy:', proxyUrl);
            
            response = await fetch(proxyUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AutoBrochure/1.0)',
              },
            });
            
            if (!response.ok) {
              errorMessage += ` | Proxy: ${response.status} ${response.statusText}`;
              console.log('Fourth attempt (proxy) failed:', response.status, response.statusText);
            }
          }
        }
      }
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ 
        error: `Network error while fetching Google Sheets: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}. Please check your internet connection and try again.` 
      }, { status: 500 });
    }
    
    if (!response.ok) {
      console.error('All fetch attempts failed. Final error:', errorMessage);
      return NextResponse.json({ 
        error: `Failed to fetch Google Sheets data (${errorMessage}). Please ensure:
1. The Google Sheet is publicly accessible (Anyone with the link can view)
2. The URL is correct and complete
3. The sheet exists and is not deleted
4. Try sharing the sheet again and copying a fresh URL` 
      }, { status: 400 });
    }
    
    const csvText = await response.text();
    console.log('CSV text received, length:', csvText.length);
    console.log('First 200 characters:', csvText.substring(0, 200));
    
    // Parse CSV data
    const values = parseCSV(csvText);
    console.log('Parsed CSV rows:', values.length);
    console.log('First row (headers):', values[0]);
    
    if (!values || values.length === 0) {
      return NextResponse.json({ 
        error: 'Google Sheets is empty or could not be parsed. The sheet might be empty or the CSV format is invalid.' 
      }, { status: 400 });
    }

    // Validate the data format
    const validation = validateGoogleSheetsData({
      values,
      range: `Sheet1!A1:${getColumnLetter(values[0]?.length || 0)}${values.length}`
    });
    
    return NextResponse.json({
      isValid: validation.isValid,
      errors: validation.errors,
      data: values,
      actualColumns: values[0]?.map(col => col?.toString() || '') || [],
      actualRowCount: values.length - 1, // Subtract header row
      productData: validation.productData
    });

  } catch (error) {
    console.error('Error processing Google Sheets:', error);
    return NextResponse.json({ 
      error: `Failed to process Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}

/**
 * Extract spreadsheet ID from various Google Sheets URL formats
 */
function extractSpreadsheetId(url: string): string | null {
  try {
    // Handle different Google Sheets URL formats
    const patterns = [
      // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      // Direct spreadsheet ID
      /^[a-zA-Z0-9-_]+$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting spreadsheet ID:', error);
    return null;
  }
}

/**
 * Extract GID (sheet ID) from Google Sheets URL
 */
function extractGid(url: string): string {
  const gidMatch = url.match(/gid=([0-9]+)/);
  return gidMatch ? gidMatch[1] : '0';
}

/**
 * Improved CSV parser that handles quotes and commas within cells
 */
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n');
  const result: string[][] = [];
  
  for (const line of lines) {
    if (line.trim()) {
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Handle escaped quotes
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of cell
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add the last cell
      row.push(current.trim());
      
      // Only add non-empty rows
      if (row.some(cell => cell.length > 0)) {
        result.push(row);
      }
    }
  }
  
  return result;
}

/**
 * Convert column number to letter (A, B, C, ..., Z, AA, AB, etc.)
 */
function getColumnLetter(columnNumber: number): string {
  let result = '';
  while (columnNumber > 0) {
    columnNumber--;
    result = String.fromCharCode(65 + (columnNumber % 26)) + result;
    columnNumber = Math.floor(columnNumber / 26);
  }
  return result || 'A';
}

/**
 * Validate Google Sheets data format for product sheets
 */
function validateGoogleSheetsData(data: { values: string[][]; range: string }): {
  isValid: boolean;
  errors: string[];
  productData?: Array<{ id: string; name: string; image: string }>;
} {
  const errors: string[] = [];
  
  if (!data.values || data.values.length === 0) {
    errors.push('Google Sheets is empty');
    return { isValid: false, errors };
  }
  
  const [headerRow, ...dataRows] = data.values;
  
  if (!headerRow || headerRow.length === 0) {
    errors.push('Google Sheets header row is missing');
    return { isValid: false, errors };
  }
  
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
    errors.push('Google Sheets must contain at least 1 data row');
  } else if (dataRows.length > 5) {
    errors.push(`Google Sheets can contain maximum 5 rows. Found: ${dataRows.length}`);
  }
  
  // If we have errors so far, return early
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  // Extract and validate product data
  const productData: Array<{ id: string; name: string; image: string }> = [];
  
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
  
  return {
    isValid: errors.length === 0,
    errors,
    productData: errors.length === 0 ? productData : undefined
  };
}

/**
 * Validate if string is a valid image URL
 */
function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Convert Google Drive share URLs to direct image URLs
 */
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
