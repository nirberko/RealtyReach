// Default fallback template (used only if file loading fails)
const FALLBACK_TEMPLATE = {
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

// GitHub repository information
const GITHUB_OWNER = 'nirberko'; // Replace with your GitHub username or organization
const GITHUB_REPO = 'RealtyReach'; // Replace with your repository name
const TEMPLATES_PATH = 'templates';
const DEFAULT_TEMPLATE_FILE = 'default-standard-inquiry.json';

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
const marketplaceTemplatesContainer = document.getElementById('marketplaceTemplates');
const refreshMarketplaceButton = document.getElementById('refreshMarketplaceButton');
const templateSearchInput = document.getElementById('templateSearch');
const marketplaceFilters = document.querySelectorAll('.marketplace-filter');

// Preview modal elements
const previewModal = document.getElementById('previewModal');
const previewTitle = document.getElementById('previewTitle');
const previewContent = document.getElementById('previewContent');
const previewClose = document.getElementById('previewClose');
const previewCloseButton = document.getElementById('previewCloseButton');

// Templates array
let templates = [];
let marketplaceTemplatesData = [];
let defaultTemplate = null;
let currentEditingTemplateId = null;
let currentFilter = 'all';
let searchQuery = '';

// Load saved settings when the page loads
document.addEventListener('DOMContentLoaded', () => {
  loadDefaultTemplate().then(() => {
    loadSettings();
    loadMarketplaceTemplates();
  });
  
  // Initialize marketplace search and filters
  setupMarketplaceSearch();
  setupMarketplaceFilters();
});

// Set up marketplace search
function setupMarketplaceSearch() {
  templateSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    filterMarketplaceTemplates();
  });
}

// Set up marketplace filters
function setupMarketplaceFilters() {
  marketplaceFilters.forEach(filter => {
    filter.addEventListener('click', () => {
      // Remove active class from all filters
      marketplaceFilters.forEach(f => f.classList.remove('active'));
      
      // Add active class to clicked filter
      filter.classList.add('active');
      
      // Update current filter
      currentFilter = filter.getAttribute('data-filter');
      
      // Filter templates
      filterMarketplaceTemplates();
    });
  });
}

// Filter marketplace templates based on search query and selected filter
function filterMarketplaceTemplates() {
  if (!marketplaceTemplatesData.length) return;
  
  renderMarketplaceTemplates(
    marketplaceTemplatesData.filter(template => {
      // Apply search filter if search query exists
      const matchesSearch = searchQuery === '' || 
        template.name.toLowerCase().includes(searchQuery) || 
        template.description.toLowerCase().includes(searchQuery) ||
        template.author.toLowerCase().includes(searchQuery) ||
        (template.category && template.category.toLowerCase().includes(searchQuery));
      
      // Apply category filter if not "all"
      let matchesCategory = true;
      if (currentFilter !== 'all') {
        // Use the category field if available, otherwise fallback to inference
        const category = template.category?.toLowerCase() || '';
        
        switch(currentFilter) {
          case 'first-time':
            matchesCategory = category === 'first-time buyer' || 
              (category === '' && (template.filename?.includes('first-time') || 
                template.description?.toLowerCase().includes('first-time')));
            break;
          case 'investment':
            matchesCategory = category === 'investment' || 
              (category === '' && (template.filename?.includes('investment') || 
                template.description?.toLowerCase().includes('investment')));
            break;
          case 'luxury':
            matchesCategory = category === 'luxury' || 
              (category === '' && (template.filename?.includes('luxury') || 
                template.description?.toLowerCase().includes('luxury')));
            break;
        }
      }
      
      return matchesSearch && matchesCategory;
    })
  );
}

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

// Preview modal close buttons
previewClose.addEventListener('click', closePreviewModal);
previewCloseButton.addEventListener('click', closePreviewModal);

// Refresh marketplace button
refreshMarketplaceButton.addEventListener('click', loadMarketplaceTemplates);

// Function to load the default template from the templates folder
async function loadDefaultTemplate() {
  try {
    // Fetch the default template from GitHub
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${TEMPLATES_PATH}/${DEFAULT_TEMPLATE_FILE}`);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const fileInfo = await response.json();
    const templateResponse = await fetch(fileInfo.download_url);
    
    if (!templateResponse.ok) {
      throw new Error(`Error fetching template: ${templateResponse.status}`);
    }
    
    const templateData = await templateResponse.json();
    
    // Create default template with a unique ID
    defaultTemplate = {
      id: 'default',
      name: templateData.name,
      content: templateData.content,
      isDefault: true
    };
    
    console.log('Default template loaded successfully');
  } catch (error) {
    console.error('Error loading default template:', error);
    // Use fallback template if loading fails
    defaultTemplate = FALLBACK_TEMPLATE;
    showStatus('Using built-in default template as fallback.', 'error');
  }
}

// Function to load saved settings from Chrome storage
function loadSettings() {
  chrome.storage.sync.get({
    // Default values if none are set
    fullName: '',
    phoneNumber: '',
    email: '',
    templates: defaultTemplate ? [defaultTemplate] : [FALLBACK_TEMPLATE]
  }, (items) => {
    // Update input fields with saved values
    fullNameInput.value = items.fullName;
    phoneNumberInput.value = items.phoneNumber;
    emailInput.value = items.email;
    
    // Load templates
    templates = items.templates;
    
    // Make sure we have at least one default template
    if (templates.length === 0) {
      templates = [defaultTemplate || FALLBACK_TEMPLATE];
    } else if (!templates.some(t => t.isDefault)) {
      // If no default template is set, make the first one default
      templates[0].isDefault = true;
    }
    
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
    // Set default template content based on the loaded default template
    templateContentInput.value = (defaultTemplate || FALLBACK_TEMPLATE).content;
  }
  
  // Show modal
  templateModal.style.display = 'flex';
}

// Function to close template modal
function closeTemplateModal() {
  templateModal.style.display = 'none';
  currentEditingTemplateId = null;
}

// Function to open preview modal
function openPreviewModal(templateId) {
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    return;
  }
  
  // Get user info for placeholders
  const fullName = fullNameInput.value.trim() || 'Your Name';
  const phoneNumber = phoneNumberInput.value.trim() || 'Your Phone';
  const email = emailInput.value.trim() || 'your.email@example.com';
  
  // Sample property data
  const samplePropertyAddress = '123 Main Street, Anytown, CA 12345';
  const sampleAgentName = 'Alex Johnson';
  
  // Replace placeholders in the template
  let previewText = template.content
    .replace(/{{your_name}}/g, fullName)
    .replace(/{{your_phone}}/g, phoneNumber)
    .replace(/{{your_email}}/g, email)
    .replace(/{{property_address}}/g, samplePropertyAddress)
    .replace(/{{agent_name}}/g, sampleAgentName);
  
  // Set the preview title and content
  previewTitle.textContent = `Preview: ${template.name}`;
  previewContent.textContent = previewText;
  
  // Show preview modal
  previewModal.style.display = 'flex';
}

// Function to close preview modal
function closePreviewModal() {
  previewModal.style.display = 'none';
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
    showStatus('You cannot delete the default template.', 'error');
    return;
  }
  
  // Remove template from array
  templates = templates.filter(t => t.id !== templateId);
  
  // Re-render template list
  renderTemplateList();
  
  // Auto-save settings
  saveSettings();
}

// Function to set template as default
function setDefaultTemplate(templateId) {
  // Find template
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    return;
  }
  
  // Update isDefault property for all templates
  templates.forEach(t => {
    t.isDefault = (t.id === templateId);
  });
  
  // Re-render template list
  renderTemplateList();
  
  // Auto-save settings
  saveSettings();
}

// Function to render the template list
function renderTemplateList() {
  // Clear container
  templateListContainer.innerHTML = '';
  
  // Render each template
  templates.forEach(template => {
    const templateItem = document.createElement('div');
    templateItem.className = 'template-item';
    
    const templateHeader = document.createElement('div');
    templateHeader.className = 'template-item-header';
    
    const templateTitle = document.createElement('div');
    templateTitle.className = 'template-item-title';
    templateTitle.textContent = template.name;
    
    if (template.isDefault) {
      const defaultBadge = document.createElement('span');
      defaultBadge.className = 'default-badge';
      defaultBadge.textContent = 'Default';
      templateTitle.appendChild(defaultBadge);
    }
    
    const templateControls = document.createElement('div');
    templateControls.className = 'template-item-controls';
    
    // Preview button
    const previewButton = document.createElement('button');
    previewButton.className = 'btn-preview';
    previewButton.textContent = 'Preview';
    previewButton.addEventListener('click', () => openPreviewModal(template.id));
    templateControls.appendChild(previewButton);
    
    // Edit button
    const editButton = document.createElement('button');
    editButton.className = 'btn-edit';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => openTemplateModal(template.id));
    templateControls.appendChild(editButton);
    
    // Make Default button (only show if not already default)
    if (!template.isDefault) {
      const makeDefaultButton = document.createElement('button');
      makeDefaultButton.className = 'btn-make-default';
      makeDefaultButton.textContent = 'Make Default';
      makeDefaultButton.addEventListener('click', () => setDefaultTemplate(template.id));
      templateControls.appendChild(makeDefaultButton);
      
      // Delete button (only show if not default)
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn-delete';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete the "${template.name}" template?`)) {
          deleteTemplate(template.id);
        }
      });
      templateControls.appendChild(deleteButton);
    }
    
    templateHeader.appendChild(templateTitle);
    templateHeader.appendChild(templateControls);
    
    const templateContent = document.createElement('pre');
    templateContent.style.whiteSpace = 'pre-wrap';
    templateContent.style.fontSize = '12px';
    templateContent.style.maxHeight = '100px';
    templateContent.style.overflow = 'auto';
    templateContent.style.backgroundColor = '#f0f0f0';
    templateContent.style.padding = '8px';
    templateContent.style.borderRadius = '4px';
    templateContent.textContent = template.content;
    
    templateItem.appendChild(templateHeader);
    templateItem.appendChild(templateContent);
    
    templateListContainer.appendChild(templateItem);
  });
}

// Function to load marketplace templates from GitHub
function loadMarketplaceTemplates() {
  // Show loading message
  marketplaceTemplatesContainer.innerHTML = `
    <div class="marketplace-loading">
      <div class="marketplace-loading-spinner"></div>
      <div>Loading marketplace templates...</div>
    </div>
  `;
  
  // Fetch templates from GitHub API
  fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${TEMPLATES_PATH}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      return response.json();
    })
    .then(files => {
      // Filter for JSON files only, excluding the default template
      const jsonFiles = files.filter(file => 
        file.name.endsWith('.json') && file.name !== DEFAULT_TEMPLATE_FILE
      );
      
      if (jsonFiles.length === 0) {
        marketplaceTemplatesContainer.innerHTML = `
          <div class="marketplace-empty">
            <p>No templates available in the marketplace yet.</p>
            <p>Be the first to contribute a template!</p>
          </div>
        `;
        return;
      }
      
      // Create promises for fetching each template file
      const templatePromises = jsonFiles.map(file => 
        fetch(file.download_url)
          .then(response => response.json())
          .then(templateData => ({ ...templateData, filename: file.name }))
      );
      
      // Wait for all template fetches to complete
      return Promise.all(templatePromises);
    })
    .then(marketplaceTemplates => {
      if (!marketplaceTemplates) return;
      
      // Store templates data
      marketplaceTemplatesData = marketplaceTemplates;
      
      // Apply any active filters
      filterMarketplaceTemplates();
    })
    .catch(error => {
      console.error('Error fetching marketplace templates:', error);
      marketplaceTemplatesContainer.innerHTML = `
        <div class="marketplace-error">
          <h3>Error loading templates</h3>
          <p>${error.message}</p>
          <p>Please try again later or check the repository configuration.</p>
        </div>
      `;
    });
}

// Function to render marketplace templates
function renderMarketplaceTemplates(filteredTemplates) {
  // Clear container
  marketplaceTemplatesContainer.innerHTML = '';
  
  // Get existing template names for comparison
  const existingTemplateNames = templates.map(t => t.name.toLowerCase());
  
  if (filteredTemplates.length === 0) {
    marketplaceTemplatesContainer.innerHTML = `
      <div class="marketplace-empty">
        <p>No templates match your search criteria.</p>
        <p>Try adjusting your search or filters.</p>
      </div>
    `;
    return;
  }
  
  // Render each marketplace template
  filteredTemplates.forEach(template => {
    const templateItem = document.createElement('div');
    templateItem.className = 'marketplace-template';
    
    // Add category tag based on category field or fallback to inference
    let categoryText = '';
    if (template.category) {
      // Use the category field if available
      categoryText = template.category;
    } else {
      // Fallback to inference for backward compatibility
      if (template.filename?.includes('first-time') || template.description?.toLowerCase().includes('first-time')) {
        categoryText = 'First Time Buyer';
      } else if (template.filename?.includes('investment') || template.description?.toLowerCase().includes('investment')) {
        categoryText = 'Investment';
      } else if (template.filename?.includes('luxury') || template.description?.toLowerCase().includes('luxury')) {
        categoryText = 'Luxury';
      }
    }
    
    if (categoryText) {
      const categoryTag = document.createElement('div');
      categoryTag.className = 'marketplace-category';
      categoryTag.textContent = categoryText;
      templateItem.appendChild(categoryTag);
    }
    
    const templateHeader = document.createElement('div');
    templateHeader.className = 'marketplace-template-header';
    
    const templateTitle = document.createElement('div');
    templateTitle.className = 'marketplace-template-title';
    templateTitle.textContent = template.name;
    
    const templateAuthor = document.createElement('div');
    templateAuthor.className = 'marketplace-template-author';
    templateAuthor.textContent = `By: ${template.author || 'Unknown'}`;
    
    templateHeader.appendChild(templateTitle);
    templateHeader.appendChild(templateAuthor);
    
    const templateDescription = document.createElement('div');
    templateDescription.className = 'marketplace-template-description';
    templateDescription.textContent = template.description || 'No description provided.';
    
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'marketplace-template-actions';
    
    // Preview button for marketplace template
    const previewButton = document.createElement('button');
    previewButton.className = 'marketplace-template-preview';
    previewButton.textContent = 'Preview';
    previewButton.addEventListener('click', () => previewMarketplaceTemplate(template));
    actionsContainer.appendChild(previewButton);
    
    const addButton = document.createElement('button');
    addButton.className = 'marketplace-template-add';
    
    // Check if this template already exists in user's templates
    const templateExists = existingTemplateNames.includes(template.name.toLowerCase());
    if (templateExists) {
      addButton.textContent = 'Already Added';
      addButton.disabled = true;
    } else {
      addButton.textContent = 'Add Template';
      addButton.addEventListener('click', () => addTemplateFromMarketplace(template));
    }
    actionsContainer.appendChild(addButton);
    
    templateItem.appendChild(templateHeader);
    templateItem.appendChild(templateDescription);
    templateItem.appendChild(actionsContainer);
    
    marketplaceTemplatesContainer.appendChild(templateItem);
  });
}

// Function to preview marketplace template
function previewMarketplaceTemplate(marketplaceTemplate) {
  // Get user info for placeholders
  const fullName = fullNameInput.value.trim() || 'Your Name';
  const phoneNumber = phoneNumberInput.value.trim() || 'Your Phone';
  const email = emailInput.value.trim() || 'your.email@example.com';
  
  // Sample property data
  const samplePropertyAddress = '123 Main Street, Anytown, CA 12345';
  const sampleAgentName = 'Alex Johnson';
  
  // Replace placeholders in the template
  let previewText = marketplaceTemplate.content
    .replace(/{{your_name}}/g, fullName)
    .replace(/{{your_phone}}/g, phoneNumber)
    .replace(/{{your_email}}/g, email)
    .replace(/{{property_address}}/g, samplePropertyAddress)
    .replace(/{{agent_name}}/g, sampleAgentName);
  
  // Set the preview title and content
  previewTitle.textContent = `Preview: ${marketplaceTemplate.name}`;
  previewContent.textContent = previewText;
  
  // Show preview modal
  previewModal.style.display = 'flex';
}

// Function to add a template from the marketplace
function addTemplateFromMarketplace(marketplaceTemplate) {
  // Create a new template object
  const newTemplate = {
    id: generateUniqueId(),
    name: marketplaceTemplate.name,
    content: marketplaceTemplate.content,
    isDefault: false
  };
  
  // Add category if available
  if (marketplaceTemplate.category) {
    newTemplate.category = marketplaceTemplate.category;
  }
  
  // Add to templates array
  templates.push(newTemplate);
  
  // Re-render template list
  renderTemplateList();
  
  // Re-render marketplace (to update the "Already Added" status)
  filterMarketplaceTemplates();
  
  // Auto-save settings
  saveSettings();
  
  // Show success message
  showStatus(`Template "${marketplaceTemplate.name}" added successfully!`, 'success');
}

// Function to reset to default
function resetToDefault() {
  if (confirm('Are you sure you want to reset all settings? This will delete all your templates except the default one.')) {
    // Reset contact info
    fullNameInput.value = '';
    phoneNumberInput.value = '';
    emailInput.value = '';
    
    // Reset templates to just the default
    templates = [defaultTemplate || FALLBACK_TEMPLATE];
    
    // Re-render template list
    renderTemplateList();
    
    // Save settings
    saveSettings();
    
    // Show success message
    showStatus('Settings reset to default.', 'success');
  }
}

// Function to show status message
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.style.display = 'block';
  
  // Hide after 3 seconds
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
} 