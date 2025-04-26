# RealtyReach Templates

This directory contains community-contributed templates for the RealtyReach Chrome extension.

## How to Use These Templates

Templates in this directory can be imported directly from the extension's template marketplace. To access the marketplace:

1. Open the extension options page
2. Click on the "Template Marketplace" button
3. Browse available templates and click "Add" to import them to your extension

## How to Contribute a Template

To contribute a template to the marketplace:

1. Create a new JSON file following this naming format: `[your-template-name].json` (use dashes instead of spaces)
2. Structure your JSON file following the template format below
3. Create a pull request with your new template file

### Template Format

```json
{
  "name": "Your Template Name",
  "description": "A brief description of when and how to use this template",
  "author": "Your Name",
  "content": "Dear {{agent_name}},\n\nYour template content goes here...\n\nThank you,\n{{your_name}}\n{{your_phone}}\n{{your_email}}"
}
```

### Available Variables

The following variables can be used in your templates:

- `{{agent_name}}` - The real estate agent's name
- `{{property_address}}` - The address of the property
- `{{your_name}}` - The user's name (set in extension options)
- `{{your_phone}}` - The user's phone number (set in extension options)
- `{{your_email}}` - The user's email address (set in extension options)

## Guidelines for Templates

- Keep templates professional and respectful
- Do not include any personal contact information
- Make sure all templates are useful for real estate inquiries
- Test your template to ensure proper formatting and variable usage 