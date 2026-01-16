# Cursor Billing Chrome Extension

A Chrome extension that enhances the Cursor.com billing dashboard by adding a comprehensive billing summary panel.

## Features

- **Visual Bar Chart**: Displays the last 12 months of billing data with amounts labeled on each bar (newest month first)
- **Billing Averages**: Shows 3-month, 6-month, and 12-month spending averages
- **Detailed Table**: Lists the last 12 months of invoices with totals (newest first)
- **Automatic Updates**: Seamlessly integrates with the Cursor dashboard and updates when navigating

## Installation

### Load as Unpacked Extension in Chrome

1. **Download or Clone** this repository to your local machine

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/` in your Chrome browser
   - Or go to Menu (⋮) → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click the "Load unpacked" button
   - Navigate to the folder containing this extension
   - Select the folder and click "Select" or "Open"

5. **Verify Installation**
   - The extension should now appear in your extensions list
   - Visit https://cursor.com/settings/billing to see the Billing Summary panel

## Files

- `manifest.json` - Extension configuration
- `content.js` - Main script that adds the billing summary panel
- `styles.css` - Styling for the billing summary components

## Usage

Simply navigate to your Cursor billing page at https://cursor.com/settings/billing and the extension will automatically add a "Billing Summary" panel below the Invoices card.
