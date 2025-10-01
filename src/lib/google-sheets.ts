export interface GoogleSheetsConfig {
  spreadsheetId: string;
  range?: string;
  apiKey?: string;
}

export interface GoogleSheetsData {
  values: any[][];
  range: string;
}

/**
 * Extract spreadsheet ID from various Google Sheets URL formats
 */
export function extractSpreadsheetId(url: string): string | null {
  try {
    // Handle different Google Sheets URL formats
    const patterns = [
      // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit?usp=sharing
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
 * Validate if a URL is a valid Google Sheets URL
 */
export function isValidGoogleSheetsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'docs.google.com' && url.includes('/spreadsheets/');
  } catch {
    return false;
  }
}

/**
 * Read data from Google Sheets using our server-side API
 * This method doesn't require API keys for public sheets
 */
export async function readGoogleSheetsPublic(url: string): Promise<any> {
  try {
    const response = await fetch('/api/google-sheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch Google Sheets data');
    }
    
    return result;
  } catch (error) {
    console.error('Error reading Google Sheets:', error);
    throw new Error(`Failed to read Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract GID (sheet ID) from Google Sheets URL
 */
export function extractGid(url: string): string {
  const gidMatch = url.match(/gid=([0-9]+)/);
  return gidMatch ? gidMatch[1] : '0';
}
