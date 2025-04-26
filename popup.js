document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI elements
  let propertyAddressElement, agentNameElement, agentEmailElement, 
      emailTemplateElement, templateSelectElement, copyButton,
      sendButton, statusElement, settingsButton, emailClientIndicator;
  
  try {
    propertyAddressElement = document.getElementById('property-address');
    agentNameElement = document.getElementById('agent-name');
    agentEmailElement = document.getElementById('agent-email');
    emailTemplateElement = document.getElementById('email-template');
    templateSelectElement = document.getElementById('template-select');
    copyButton = document.getElementById('copy-button');
    sendButton = document.getElementById('send-button');
    statusElement = document.getElementById('status');
    settingsButton = document.getElementById('settings-button');
    emailClientIndicator = document.getElementById('email-client-indicator');
  } catch (error) {
    console.error('Error initializing UI elements:', error);
    // We'll continue and let individual functions handle missing elements
  }

  // Property and agent information
  let propertyInfo = null;
  // Templates array
  let templates = [];

  // Add a click handler for the settings button
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      try {
        chrome.runtime.openOptionsPage();
      } catch (error) {
        console.error('Error opening options page:', error);
        safeShowStatus('Error opening settings page. Please try again.', 'error');
      }
    });
  }

  // Handle template selection change
  if (templateSelectElement) {
    templateSelectElement.addEventListener('change', () => {
      try {
        const selectedTemplateId = templateSelectElement.value;
        if (selectedTemplateId === 'loading') return;
        
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        if (selectedTemplate) {
          applyTemplate(selectedTemplate);
        }
      } catch (error) {
        console.error('Error handling template selection:', error);
        safeShowStatus('Error selecting template. Please try again.', 'error');
      }
    });
  }

  // Check if user settings are complete before initializing
  checkUserSettings();

  // Function to check if user settings are complete
  function checkUserSettings() {
    try {
      chrome.storage.sync.get({
        fullName: '',
        phoneNumber: '',
        email: '',
        emailClient: 'native' // Add default email client preference
      }, (userSettings) => {
        // Update email client indicator
        if (emailClientIndicator) {
          const clientText = userSettings.emailClient === 'gmail' ? 
            'Using Gmail for sending' : 
            'Using native email app for sending';
          emailClientIndicator.textContent = clientText;
        }
        
        if (!userSettings.fullName || !userSettings.phoneNumber || !userSettings.email) {
          // Create settings alert container if it doesn't exist
          let alertContainer = document.getElementById('settings-alert');
          if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'settings-alert';
            
            const container = document.querySelector('.container');
            container.insertBefore(alertContainer, container.firstChild);
          }
          
          alertContainer.innerHTML = `
            <p><strong>Profile Incomplete!</strong> Please complete your profile in settings to use the email generator.</p>
            <button id="go-to-settings">Go to Settings</button>
          `;
          
          // Add click event for the Go to Settings button
          document.getElementById('go-to-settings').addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
          });
          
          // Disable email functionality
          if (sendButton) sendButton.disabled = true;
          if (copyButton) copyButton.disabled = true;
          if (templateSelectElement) templateSelectElement.disabled = true;
          if (emailTemplateElement) {
            emailTemplateElement.disabled = true;
            emailTemplateElement.value = "Please complete your profile in settings first to use this feature.";
          }
        } else {
          // User settings are complete, proceed with initialization
          initializePage();
        }
      });
    } catch (error) {
      console.error('Error checking user settings:', error);
      // If there's an error, proceed with initialization anyway
      initializePage();
    }
  }

  function initializePage() {
    try {
      // Get the current tab to fetch property and agent information
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        try {
          // Check if we got a valid tab result
          if (!tabs || tabs.length === 0) {
            safeShowStatus('Error: Unable to access current tab information.', 'error');
            return;
          }
          
          const currentTab = tabs[0];
          
          // Check if we have access to the URL
          if (!currentTab || typeof currentTab.url !== 'string') {
            safeShowStatus('Error: Unable to access tab URL. Make sure you have the proper permissions.', 'error');
            return;
          }
          
          // Check if we're on a Zillow property page
          if (currentTab.url.includes('zillow.com')) {
            // Send a message to the content script to get property and agent info
            try {
              chrome.tabs.sendMessage(
                currentTab.id,
                { action: 'getPropertyAndAgentInfo' },
                (response) => {
                  try {
                    if (chrome.runtime.lastError) {
                      console.error('Chrome runtime error:', chrome.runtime.lastError);
                      safeShowStatus('Error connecting to page. Please refresh and try again.', 'error');
                      return;
                    }

                    if (response && response.propertyAddress) {
                      propertyInfo = response;
                      
                      if (propertyAddressElement) {
                        propertyAddressElement.textContent = response.propertyAddress;
                      }
                      
                      if (agentNameElement && response.agentName) {
                        agentNameElement.textContent = response.agentName;
                      }
                      
                      if (agentEmailElement && response.agentEmail) {
                        agentEmailElement.textContent = response.agentEmail;
                      }

                      // Load user settings and templates
                      loadUserSettingsAndTemplates();
                    } else {
                      safeShowStatus('No property details found. Make sure you\'re on a property listing page.', 'error');
                    }
                  } catch (error) {
                    console.error('Error processing tab response:', error);
                    safeShowStatus('Error processing page data. Please try again.', 'error');
                  }
                }
              );
            } catch (error) {
              console.error('Error sending message to tab:', error);
              safeShowStatus('Error connecting to page. Please try again.', 'error');
            }
          } else {
            safeShowStatus('Please navigate to a Zillow property page to use this extension.', 'error');
          }
        } catch (error) {
          console.error('Error processing tabs:', error);
          safeShowStatus('Error accessing tab information. Please try again.', 'error');
        }
      });
    } catch (error) {
      console.error('Error querying tabs:', error);
      safeShowStatus('Error accessing browser tabs. Please try again.', 'error');
    }
  }

  // Copy email template to clipboard
  if (copyButton && emailTemplateElement) {
    copyButton.addEventListener('click', () => {
      try {
        emailTemplateElement.select();
        document.execCommand('copy');
        safeShowStatus('Email template copied to clipboard!', 'success');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        safeShowStatus('Error copying to clipboard. Please try again.', 'error');
      }
    });
  }

  // Send email (opens default mail client or Gmail based on user preference)
  if (sendButton && agentEmailElement && propertyAddressElement && emailTemplateElement) {
    sendButton.addEventListener('click', () => {
      try {
        const agentEmail = agentEmailElement.textContent;
        
        if (agentEmail && !agentEmail.includes('Not detected')) {
          const subject = `Inquiry about property at ${propertyAddressElement.textContent}`;
          const body = encodeURIComponent(emailTemplateElement.value);
          
          // Get user's preferred email client
          chrome.storage.sync.get({
            emailClient: 'native' // Default to native email app if not set
          }, (settings) => {
            try {
              if (settings.emailClient === 'gmail') {
                // Open Gmail compose window
                const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${agentEmail}&su=${encodeURIComponent(subject)}&body=${body}`;
                window.open(gmailUrl);
                safeShowStatus('Opening Gmail...', 'success');
              } else {
                // Open default email client (native app)
                window.open(`mailto:${agentEmail}?subject=${encodeURIComponent(subject)}&body=${body}`);
                safeShowStatus('Opening email client...', 'success');
              }
            } catch (error) {
              console.error('Error opening email client:', error);
              safeShowStatus('Error opening email client. Please try again.', 'error');
            }
          });
        } else {
          safeShowStatus('Agent email not detected. Unable to send email.', 'error');
        }
      } catch (error) {
        console.error('Error sending email:', error);
        safeShowStatus('Error opening email client. Please try again.', 'error');
      }
    });
  }

  // Function to apply a template and replace placeholders
  function applyTemplate(template) {
    try {
      if (!template || !propertyInfo || !emailTemplateElement) return;
      
      let templateText = template.content;
      
      // Replace property and agent info
      templateText = templateText.replace(/{{property_address}}/g, propertyInfo.propertyAddress || '');
      templateText = templateText.replace(/{{agent_name}}/g, propertyInfo.agentName || 'Agent');
      
      // Replace user info - load from storage first
      chrome.storage.sync.get({
        fullName: '',
        phoneNumber: '',
        email: ''
      }, (userSettings) => {
        try {
          templateText = templateText.replace(/{{your_name}}/g, userSettings.fullName || '[Your Name]');
          templateText = templateText.replace(/{{your_phone}}/g, userSettings.phoneNumber || '[Your Phone Number]');
          templateText = templateText.replace(/{{your_email}}/g, userSettings.email || '[Your Email]');
          
          // Update the template field
          emailTemplateElement.value = templateText;
        } catch (error) {
          console.error('Error applying user settings to template:', error);
        }
      });
    } catch (error) {
      console.error('Error applying template:', error);
      safeShowStatus('Error applying email template. Please try again.', 'error');
    }
  }

  // Function to load user settings and templates
  function loadUserSettingsAndTemplates() {
    try {
      chrome.storage.sync.get({
        // Default values
        templates: [{
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
        }]
      }, (items) => {
        try {
          // Store templates
          templates = items.templates || [];
          
          // Populate template selector
          populateTemplateSelector();
          
          // Apply the default template
          const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
          if (defaultTemplate) {
            if (templateSelectElement) {
              templateSelectElement.value = defaultTemplate.id;
            }
            applyTemplate(defaultTemplate);
          }
        } catch (error) {
          console.error('Error processing templates:', error);
          safeShowStatus('Error loading templates. Please try again.', 'error');
        }
      });
    } catch (error) {
      console.error('Error loading user settings:', error);
      safeShowStatus('Error loading settings. Please try again.', 'error');
    }
  }
  
  // Function to populate the template selector dropdown
  function populateTemplateSelector() {
    try {
      if (!templateSelectElement) return;
      
      // Clear existing options
      templateSelectElement.innerHTML = '';
      
      // If no templates, show a message
      if (!templates || templates.length === 0) {
        const option = document.createElement('option');
        option.value = 'no-templates';
        option.textContent = 'No templates available';
        templateSelectElement.appendChild(option);
        return;
      }
      
      // Sort templates (default first, then alphabetically)
      const sortedTemplates = [...templates].sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });
      
      // Add options for each template
      sortedTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name + (template.isDefault ? ' (Default)' : '');
        templateSelectElement.appendChild(option);
      });
    } catch (error) {
      console.error('Error populating template selector:', error);
      // We don't show a UI error here since it's a secondary function
    }
  }

  // Helper function to safely show status messages
  function safeShowStatus(message, type = 'success') {
    console.log(`Status message: ${message} (${type})`);
    
    try {
      if (!statusElement) {
        console.warn('Status element not found, cannot show message:', message);
        return;
      }
      
      statusElement.textContent = message || 'An error occurred';
      statusElement.className = 'status ' + (type || 'error');
      statusElement.style.display = 'block';
      
      // Hide the message after 5 seconds
      setTimeout(() => {
        if (statusElement) {
          statusElement.style.display = 'none';
        }
      }, 5000);
    } catch (error) {
      console.error('Error showing status message:', error);
      // At this point we can't do much more than log the error
    }
  }
}); 