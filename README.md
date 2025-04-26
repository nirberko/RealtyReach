# RealtyReach Chrome Extension

A Chrome extension that helps you generate and send emails to property agents on real estate listing sites.

## Features

- Automatically extracts property address from supported real estate property pages
- Identifies agent information when available
- Allows you to use a customizable email template
- Opens your default email client to send the message
- Simple, intuitive interface

## Installation

### Developer Mode

1. Clone or download this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top-right corner
4. Click "Load unpacked" and select the directory where you downloaded this extension
5. The extension should now be installed and visible in your Chrome toolbar

## How to Use

1. Visit a property listing page on a supported real estate site (e.g., Zillow.com, Realtor.com, Redfin.com)
2. Click the RealtyReach icon in your Chrome toolbar
3. The extension will automatically populate the property address and agent information (if available)
4. Customize the email template as needed
5. Click "Send Email" to open your default email client with the pre-filled message
6. If the agent's email address couldn't be detected, it will provide a placeholder that you'll need to replace

## Limitations

- The extension can only extract information that's publicly available on the property page
- Some agents may not have their email addresses publicly displayed
- Website structures may change over time, which could affect the extension's ability to extract information

## Privacy

This extension:
- Only operates on supported real estate listing pages
- Does not collect or transmit any personal data
- Does not store any browsing history
- Works entirely locally in your browser

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 