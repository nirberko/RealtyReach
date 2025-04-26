// Default email template
const DEFAULT_TEMPLATE = {
  id: 'default',
  name: 'Standard Inquiry',
  isDefault: true,
  content: `Dear {{agent_name}},

I am interested in the property at {{property_address}} that I found on Zillow. I would like to schedule a viewing at your earliest convenience.

Could you please provide me with more information about this property, including:
- Current status (is it still available?)
- Any recent price changes
- Details about the neighborhood
- Potential closing timeline

I'm looking forward to hearing back from you soon.

Thank you,
{{your_name}}
{{your_phone}}
{{your_email}}`
};

// DOM elements
const fullNameInput = document.getElementById('fullName');
const phoneNumberInput = document.getElementById('phoneNumber');
const emailInput = document.getElementById('email');
const templateListContainer = document.getElementById('templateList');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');
const statusMessage = document.getElementById('statusMessage');
const addTemplateButton = document.getElementById('addTemplateButton');
const templateModal = document.getElementById('templateModal');
const modalTitle = document.getElementById('modalTitle');
const templateNameInput = document.getElementById('templateName');
const templateContentInput = document.getElementById('templateContent');
const modalSaveButton = document.getElementById('modalSave');
const modalCancelButton = document.getElementById('modalCancel');
const modalCloseButton = document.getElementById('modalClose');

// Templates array
let templates = [];
let currentEditingTemplateId = null;

// Load saved settings when the page loads
document.addEventListener('DOMContentLoaded', loadSettings);

// Save settings when the save button is clicked
saveButton.addEventListener('click', saveSettings);

// Reset to default when the reset button is clicked
resetButton.addEventListener('click', resetToDefault);

// Add new template
addTemplateButton.addEventListener('click', () => openTemplateModal());

// Modal save button
modalSaveButton.addEventListener('click', saveTemplate);

// Modal cancel and close buttons
modalCancelButton.addEventListener('click', closeTemplateModal);
modalCloseButton.addEventListener('click', closeTemplateModal);

// Function to load saved settings from Chrome storage
function loadSettings() {
  chrome.storage.sync.get({
    // Default values if none are set
    fullName: '',
    phoneNumber: '',
    email: '',
    templates: [DEFAULT_TEMPLATE]
  }, (items) => {
    // Update input fields with saved values
    fullNameInput.value = items.fullName;
    phoneNumberInput.value = items.phoneNumber;
    emailInput.value = items.email;
    
    // Load templates
    templates = items.templates;
    renderTemplateList();
  });
}

// Function to save settings to Chrome storage
function saveSettings() {
  // Get values from input fields
  const fullName = fullNameInput.value.trim();
  const phoneNumber = phoneNumberInput.value.trim();
  const email = emailInput.value.trim();
  
  // Save to Chrome storage
  chrome.storage.sync.set({
    fullName,
    phoneNumber,
    email,
    templates
  }, () => {
    // Show success message
    showStatus('Settings saved successfully!', 'success');
  });
}

// Function to open template modal for adding or editing
function openTemplateModal(templateId = null) {
  // Clear previous values
  templateNameInput.value = '';
  templateContentInput.value = '';
  
  if (templateId) {
    // Edit existing template
    currentEditingTemplateId = templateId;
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      modalTitle.textContent = 'Edit Template';
      templateNameInput.value = template.name;
      templateContentInput.value = template.content;
    }
  } else {
    // Add new template
    currentEditingTemplateId = null;
    modalTitle.textContent = 'Add New Template';
    // Set default template content
    templateContentInput.value = DEFAULT_TEMPLATE.content;
  }
  
  // Show modal
  templateModal.style.display = 'flex';
}

// Function to close template modal
function closeTemplateModal() {
  templateModal.style.display = 'none';
  currentEditingTemplateId = null;
}

// Function to generate a unique ID
function generateUniqueId() {
  return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Function to save template (add new or update existing)
function saveTemplate() {
  const name = templateNameInput.value.trim();
  const content = templateContentInput.value.trim();
  
  if (!name) {
    showStatus('Please enter a template name', 'error');
    return;
  }
  
  if (!content) {
    showStatus('Please enter template content', 'error');
    return;
  }
  
  if (currentEditingTemplateId) {
    // Update existing template
    const index = templates.findIndex(t => t.id === currentEditingTemplateId);
    
    if (index !== -1) {
      const isDefault = templates[index].isDefault;
      templates[index] = {
        id: currentEditingTemplateId,
        name,
        content,
        isDefault
      };
    }
  } else {
    // Add new template
    const newTemplate = {
      id: generateUniqueId(),
      name,
      content,
      isDefault: templates.length === 0 // Make it default if it's the first template
    };
    
    templates.push(newTemplate);
  }
  
  // Re-render template list
  renderTemplateList();
  
  // Auto-save settings
  saveSettings();
  
  // Close modal
  closeTemplateModal();
}

// Function to delete template
function deleteTemplate(templateId) {
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    return;
  }
  
  if (template.isDefault) {
    showStatus('Cannot delete the default template', 'error');
    return;
  }
  
  if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
    templates = templates.filter(t => t.id !== templateId);
    renderTemplateList();
    saveSettings();
  }
}

// Function to set template as default
function setDefaultTemplate(templateId) {
  templates.forEach(template => {
    template.isDefault = template.id === templateId;
  });
  
  renderTemplateList();
  saveSettings();
}

// Function to render template list
function renderTemplateList() {
  // Clear existing list
  templateListContainer.innerHTML = '';
  
  // If no templates, show empty state
  if (templates.length === 0) {
    templateListContainer.innerHTML = `
      <div class="template-item">
        <p>No templates yet. Click "Add New Template" to create one.</p>
      </div>
    `;
    return;
  }
  
  // Sort templates (default first, then alphabetically)
  const sortedTemplates = [...templates].sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Create template items
  sortedTemplates.forEach(template => {
    const templateItem = document.createElement('div');
    templateItem.className = 'template-item';
    
    templateItem.innerHTML = `
      <div class="template-item-header">
        <div class="template-item-title">
          ${template.name}
          ${template.isDefault ? '<span class="default-badge">Default</span>' : ''}
        </div>
        <div class="template-item-controls">
          <button class="btn-edit" data-id="${template.id}">Edit</button>
          ${!template.isDefault ? `<button class="btn-make-default" data-id="${template.id}">Make Default</button>` : ''}
          ${!template.isDefault ? `<button class="btn-delete" data-id="${template.id}">Delete</button>` : ''}
        </div>
      </div>
      <div class="template-preview">
        ${template.content.substring(0, 100)}...
      </div>
    `;
    
    templateListContainer.appendChild(templateItem);
    
    // Add event listeners
    const editButton = templateItem.querySelector('.btn-edit');
    editButton.addEventListener('click', () => openTemplateModal(template.id));
    
    const makeDefaultButton = templateItem.querySelector('.btn-make-default');
    if (makeDefaultButton) {
      makeDefaultButton.addEventListener('click', () => setDefaultTemplate(template.id));
    }
    
    const deleteButton = templateItem.querySelector('.btn-delete');
    if (deleteButton) {
      deleteButton.addEventListener('click', () => deleteTemplate(template.id));
    }
  });
}

// Function to reset settings to default values
function resetToDefault() {
  if (confirm('Are you sure you want to reset all settings to default values? This will delete all your custom templates.')) {
    fullNameInput.value = '';
    phoneNumberInput.value = '';
    emailInput.value = '';
    templates = [DEFAULT_TEMPLATE];
    
    // Save the default values
    saveSettings();
    
    // Update UI
    renderTemplateList();
    
    showStatus('Settings reset to default values.', 'success');
  }
}

// Function to show status message
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.style.display = 'block';
  
  // Hide message after 3 seconds
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
} 