// Default fallback template (used only if file loading fails completely)
const FALLBACK_TEMPLATE = {
  id: 'default',
  name: 'Standard Inquiry',
  isDefault: true,
  content: 'Failed to load default template. Please refresh the page or check your connection.'
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
const emailClientSelect = document.getElementById('emailClient');
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
const marketplaceFiltersContainer = document.getElementById('marketplaceFilters');

// Preview modal elements
const previewModal = document.getElementById('previewModal');
const previewTitle = document.getElementById('previewTitle');
const previewContent = document.getElementById('previewContent');
const previewClose = document.getElementById('previewClose');
const previewCloseButton = document.getElementById('previewCloseButton');

// Contact history elements
const historySearchInput = document.getElementById('historySearch');
const clearHistoryButton = document.getElementById('clearHistoryButton');
const contactHistoryContainer = document.getElementById('contactHistoryContainer');

// Templates array
let templates = [];
let marketplaceTemplatesData = [];
let defaultTemplate = null;
let currentEditingTemplateId = null;
let currentFilter = 'all';
let searchQuery = '';
let contactedProperties = {};
let historySearchQuery = '';

// Load saved settings when the page loads
document.addEventListener('DOMContentLoaded', () => {
  loadDefaultTemplate().then(() => {
    loadSettings();
    loadMarketplaceTemplates();
    loadContactHistory();
  });
  
  // Initialize marketplace search and filters
  setupMarketplaceSearch();
  setupMarketplaceFilters();
  
  // Initialize contact history search and clear button
  setupContactHistoryHandlers();
  
  // Set up tabs
  setupTabs();
});

// Set up tabs functionality
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      
      // Hide all tab contents
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Show corresponding tab content
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}

// Set up contact history handlers
function setupContactHistoryHandlers() {
  if (historySearchInput) {
    historySearchInput.addEventListener('input', (e) => {
      historySearchQuery = e.target.value.toLowerCase();
      renderContactHistory();
    });
  }
  
  if (clearHistoryButton) {
    clearHistoryButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all contact history? This action cannot be undone.')) {
        chrome.storage.local.set({ contactedProperties: {} }, () => {
          contactedProperties = {};
          renderContactHistory();
          showStatus('Contact history cleared successfully.', 'success');
        });
      }
    });
  }
}

// Function to load contact history from chrome storage
function loadContactHistory() {
  chrome.storage.local.get({ contactedProperties: {} }, (result) => {
    contactedProperties = result.contactedProperties || {};
    renderContactHistory();
  });
}

// Function to render contact history table
function renderContactHistory() {
  if (!contactHistoryContainer) return;
  
  // Clear container
  contactHistoryContainer.innerHTML = '';
  
  // Check if there is any history
  const propertyIds = Object.keys(contactedProperties);
  
  if (propertyIds.length === 0) {
    contactHistoryContainer.innerHTML = `
      <div class="history-empty">
        <p>No contact history available. Start sending emails to property agents to build your history.</p>
      </div>
    `;
    return;
  }
  
  // Filter properties based on search query
  const filteredProperties = propertyIds.filter(id => {
    const property = contactedProperties[id];
    return property.address.toLowerCase().includes(historySearchQuery) ||
           property.agent.toLowerCase().includes(historySearchQuery);
  });
  
  if (filteredProperties.length === 0) {
    contactHistoryContainer.innerHTML = `
      <div class="history-empty">
        <p>No properties match your search. Try a different search term.</p>
      </div>
    `;
    return;
  }
  
  // Create history table
  const table = document.createElement('table');
  table.className = 'history-table';
  
  // Create table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Property Address</th>
      <th>Agent</th>
      <th>Last Contacted</th>
      <th>Status</th>
      <th>Times</th>
      <th>Actions</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  // Sort properties by most recently contacted
  filteredProperties.sort((a, b) => {
    const dateA = new Date(contactedProperties[a].lastContacted);
    const dateB = new Date(contactedProperties[b].lastContacted);
    return dateB - dateA;
  });
  
  // Add rows for each property
  filteredProperties.forEach(id => {
    const property = contactedProperties[id];
    const row = document.createElement('tr');
    
    const contactDate = new Date(property.lastContacted);
    const formattedDate = contactDate.toLocaleDateString() + ' ' + 
                          contactDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const contactTypeBadgeClass = property.contactType === 'sent' ? 'contact-type-sent' : 'contact-type-copied';
    const contactTypeText = property.contactType === 'sent' ? 'Sent' : 'Copied';
    
    row.innerHTML = `
      <td>${property.address}</td>
      <td>${property.agent}</td>
      <td>${formattedDate}</td>
      <td><span class="contact-type-badge ${contactTypeBadgeClass}">${contactTypeText}</span></td>
      <td>${property.timesContacted}</td>
      <td>
        <div class="history-actions">
          <button class="history-action-button history-view" data-property-id="${id}">Visit</button>
          <button class="history-action-button history-delete" data-property-id="${id}">Delete</button>
        </div>
      </td>
    `;
    
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  contactHistoryContainer.appendChild(table);
  
  // Add event listeners to action buttons
  const viewButtons = contactHistoryContainer.querySelectorAll('.history-view');
  viewButtons.forEach(button => {
    button.addEventListener('click', () => {
      const propertyId = button.getAttribute('data-property-id');
      const property = contactedProperties[propertyId];
      if (property && property.url) {
        // Open the property URL in a new tab
        chrome.tabs.create({ url: property.url });
      } else {
        showStatus('Unable to open property page. URL not available.', 'error');
      }
    });
  });
  
  const deleteButtons = contactHistoryContainer.querySelectorAll('.history-delete');
  deleteButtons.forEach(button => {
    button.addEventListener('click', () => {
      const propertyId = button.getAttribute('data-property-id');
      const property = contactedProperties[propertyId];
      
      if (confirm(`Are you sure you want to delete "${property.address}" from your contact history?`)) {
        deletePropertyHistory(propertyId);
      }
    });
  });
}

// Function to delete a single property from history
function deletePropertyHistory(propertyId) {
  delete contactedProperties[propertyId];
  
  chrome.storage.local.set({ contactedProperties }, () => {
    renderContactHistory();
    showStatus('Property removed from contact history.', 'success');
  });
}

// Set up marketplace search
function setupMarketplaceSearch() {
  templateSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    filterMarketplaceTemplates();
  });
}

// Set up marketplace filters
function setupMarketplaceFilters() {
  // Initial setup for "All Templates" filter
  const allFilter = marketplaceFiltersContainer.querySelector('[data-filter="all"]');
  if (allFilter) {
    allFilter.addEventListener('click', () => {
      // Remove active class from all filters
      const filters = marketplaceFiltersContainer.querySelectorAll('.marketplace-filter');
      filters.forEach(f => f.classList.remove('active'));
      
      // Add active class to clicked filter
      allFilter.classList.add('active');
      
      // Update current filter
      currentFilter = 'all';
      
      // Filter templates
      filterMarketplaceTemplates();
    });
  }

  // The rest of the filters will be created dynamically when templates are loaded
}

// Function to create dynamic category filters based on available templates
function createCategoryFilters() {
  // Remove existing category filters (except "All Templates" and the refresh button)
  const existingFilters = marketplaceFiltersContainer.querySelectorAll('.marketplace-filter:not([data-filter="all"])');
  existingFilters.forEach(filter => filter.remove());
  
  // Extract unique categories from marketplace templates
  const categories = new Set();
  marketplaceTemplatesData.forEach(template => {
    // Use the explicit category if available
    if (template.category) {
      categories.add(template.category);
    } 
    // Use inferred categories as fallback
    else {
      // Check for common category terms in filename or description
      if (template.filename?.includes('first-time') || template.description?.toLowerCase().includes('first-time')) {
        categories.add('First Time Buyer');
      }
      if (template.filename?.includes('investment') || template.description?.toLowerCase().includes('investment')) {
        categories.add('Investment');
      }
      if (template.filename?.includes('luxury') || template.description?.toLowerCase().includes('luxury')) {
        categories.add('Luxury');
      }
    }
  });
  
  // Get the refresh button so we can insert filters before it
  const refreshButton = document.getElementById('refreshMarketplaceButton');
  
  // Create filter button for each unique category
  categories.forEach(category => {
    const filterButton = document.createElement('div');
    filterButton.className = 'marketplace-filter';
    filterButton.setAttribute('data-filter', category.toLowerCase().replace(/\s+/g, '-'));
    filterButton.textContent = category;
    
    // Add click event listener
    filterButton.addEventListener('click', () => {
      // Remove active class from all filters
      const filters = marketplaceFiltersContainer.querySelectorAll('.marketplace-filter');
      filters.forEach(f => f.classList.remove('active'));
      
      // Add active class to clicked filter
      filterButton.classList.add('active');
      
      // Update current filter
      currentFilter = filterButton.getAttribute('data-filter');
      
      // Filter templates
      filterMarketplaceTemplates();
    });
    
    // Insert the filter before the refresh button
    marketplaceFiltersContainer.insertBefore(filterButton, refreshButton);
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
        // Get the normalized filter name
        const filterName = currentFilter.replace(/-/g, ' ');
        
        // Use the category field if available
        if (template.category) {
          matchesCategory = template.category.toLowerCase() === filterName;
        } 
        // Fallback to inferred categories
        else {
          const lowerDesc = template.description?.toLowerCase() || '';
          const filename = template.filename?.toLowerCase() || '';
          
          switch(filterName) {
            case 'first time buyer':
              matchesCategory = filename.includes('first-time') || lowerDesc.includes('first time');
              break;
            case 'investment':
              matchesCategory = filename.includes('investment') || lowerDesc.includes('investment');
              break;
            case 'luxury':
              matchesCategory = filename.includes('luxury') || lowerDesc.includes('luxury');
              break;
            default:
              // For any other category, check if category name appears in description or filename
              matchesCategory = filename.includes(filterName) || lowerDesc.includes(filterName);
          }
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
      isDefault: true,
      description: templateData.description,
      author: templateData.author
    };
    
    console.log('Default template loaded successfully from JSON file');
  } catch (error) {
    console.error('Error loading default template:', error);
    // Use fallback template if loading fails
    defaultTemplate = FALLBACK_TEMPLATE;
    showStatus('Error loading default template. Using fallback.', 'error');
  }
}

// Function to load saved settings from Chrome storage
function loadSettings() {
  chrome.storage.sync.get({
    // Default values if none are set
    fullName: '',
    phoneNumber: '',
    email: '',
    emailClient: 'native', // Default to native email app
    templates: []  // Start with empty array instead of a default
  }, (items) => {
    // Update input fields with saved values
    fullNameInput.value = items.fullName;
    phoneNumberInput.value = items.phoneNumber;
    emailInput.value = items.email;
    emailClientSelect.value = items.emailClient;
    
    // Load templates - if user has saved templates, use those
    if (items.templates && items.templates.length > 0) {
      templates = items.templates;
      
      // Make sure we have at least one default template
      if (!templates.some(t => t.isDefault)) {
        // If no default template is set, make the first one default
        templates[0].isDefault = true;
      }
    } else {
      // If user has no templates, use the loaded default from JSON
      templates = defaultTemplate ? [defaultTemplate] : [FALLBACK_TEMPLATE];
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
  const emailClient = emailClientSelect.value;
  
  // Save to Chrome storage
  chrome.storage.sync.set({
    fullName,
    phoneNumber,
    email,
    emailClient,
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
    
    // Set default content based on the loaded default template from JSON
    if (defaultTemplate && defaultTemplate.content) {
      templateContentInput.value = defaultTemplate.content;
    } else {
      // This should rarely happen as we load the default template first
      console.warn('Default template not loaded yet, using empty template');
      templateContentInput.value = '';
    }
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
      
      // Generate dynamic category filters based on available templates
      createCategoryFilters();
      
      // Apply any active filters
      filterMarketplaceTemplates();
      addMarketplaceFooter();
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
      } else {
        // Try to extract a category from filename if not one of the predefined categories
        const filenameWithoutExt = template.filename?.replace('.json', '') || '';
        const parts = filenameWithoutExt.split('-');
        if (parts.length > 1) {
          // Use capitalized words from filename as category
          categoryText = parts
            .slice(0, -1) // Exclude the last part which is usually "template"
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
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

// Helper to add the marketplace footer outside the grid
function addMarketplaceFooter() {
  // Remove any existing footer
  const oldFooter = document.querySelector('.marketplace-footer');
  if (oldFooter) oldFooter.remove();

  // Add marketplace footer with GitHub link after the grid
  const marketplaceFooter = document.createElement('div');
  marketplaceFooter.className = 'marketplace-footer';
  marketplaceFooter.style.marginTop = '24px';
  marketplaceFooter.style.textAlign = 'center';
  marketplaceFooter.style.fontSize = '13px';
  marketplaceFooter.innerHTML = `
    <hr style="margin: 16px 0;">
    <span>
      Want to create and publish your own template? Visit the
      <a href="https://github.com/nirberko/RealtyReach/tree/main/templates" target="_blank" rel="noopener noreferrer">GitHub templates folder</a>.
      <br>
      This is the place to contribute new templates to the marketplace!
    </span>
  `;
  // Insert after the marketplaceTemplatesContainer
  if (marketplaceTemplatesContainer && marketplaceTemplatesContainer.parentNode) {
    marketplaceTemplatesContainer.parentNode.insertBefore(marketplaceFooter, marketplaceTemplatesContainer.nextSibling);
  }
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
    content: marketplaceTemplate.content
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