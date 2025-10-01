# Google Sheets Integration

This document explains how to use the new Google Sheets URL feature in AutoBrochure.

## Features Added

1. **Google Sheets URL Support**: Users can now provide a Google Sheets URL instead of uploading a file
2. **Dual Input Method**: Toggle between file upload and Google Sheets URL input
3. **Public Sheet Access**: Reads data from publicly accessible Google Sheets
4. **Same Validation**: Uses the same validation rules as file uploads

## How to Use

### For Users

1. **Make Your Google Sheet Public**:
   - Open your Google Sheet
   - Click "Share" in the top right
   - Change access to "Anyone with the link can view"
   - Copy the share URL

2. **Use in AutoBrochure**:
   - Go to the image gallery or image replacer
   - Click "Google Sheets URL" toggle
   - Paste your Google Sheets URL
   - Click "Load"

### Required Sheet Format

Your Google Sheet must have these columns:
- `name`: Product name
- `id`: Unique product ID
- `image`: Image URL (Google Drive links are auto-converted)

Maximum 5 rows of data are supported.

### Example Google Sheets URLs

```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing
```

## Technical Implementation

### Files Modified

1. **`src/lib/google-sheets.ts`**: New utility for Google Sheets API integration
2. **`src/lib/sheet-validation.ts`**: Added `validateProductSheetFromUrl()` function
3. **`src/components/image-replacer.tsx`**: Updated UI with toggle and URL input
4. **`src/components/image-gallery.tsx`**: Updated upload dialog with URL support

### Key Functions

- `extractSpreadsheetId()`: Extracts spreadsheet ID from various URL formats
- `readGoogleSheetsPublic()`: Reads data using public CSV export (no API key needed)
- `validateGoogleSheetsData()`: Validates sheet format and data
- `validateProductSheetFromUrl()`: Main validation function for URLs

### Error Handling

- Invalid URL format detection
- Public access validation
- Same data validation as file uploads
- Graceful fallback for inaccessible sheets

## Troubleshooting

### Common Issues

1. **"Invalid Google Sheets URL"**: Make sure you're using a valid Google Sheets URL
2. **"Failed to read Google Sheets"**: Ensure the sheet is publicly accessible
3. **"Missing required columns"**: Check that your sheet has `name`, `id`, and `image` columns
4. **"Sheet has too many rows"**: Limit your data to 5 rows maximum

### Making Sheets Public

If you get access errors, follow these steps carefully:

1. **Open your Google Sheet**
2. **Click "Share" button** (top right corner)
3. **Change access level**:
   - Click "Restricted" dropdown
   - Select "Anyone with the link"
   - Make sure it says "Viewer" (not Editor)
4. **Copy the share URL** - it should look like:
   ```
   https://docs.google.com/spreadsheets/d/[LONG_ID]/edit?usp=sharing
   ```
5. **Test the URL**: Open it in an incognito/private browser window to verify public access

### Troubleshooting Access Issues

If you still get "400 Bad Request" errors:

1. **Double-check sharing settings**: The sheet MUST be "Anyone with the link can view"
2. **Try publishing to web**:
   - File → Share → Publish to web
   - Choose "Entire Document" and "Web page"
   - Click "Publish"
   - Use the published URL instead
3. **Check the sheet format**: Ensure you have the required columns (name, id, image)
4. **Verify the URL**: Make sure you're copying the full sharing URL, not just the browser address

## Security Considerations

- Only reads from publicly accessible sheets
- No authentication required
- Uses Google's public CSV export feature
- No API keys stored or required
- Same data validation as file uploads

## Future Enhancements

Potential improvements:
- Support for Google Sheets API with authentication
- Support for private sheets with API keys
- Batch processing of multiple sheets
- Real-time sync with Google Sheets changes
