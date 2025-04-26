// Reference to the site handler for the current website
let currentSiteHandler = null;

// Function to initialize the site handler based on the current URL
function initializeSiteHandler() {
  currentSiteHandler = window.siteFactory.getSiteHandler(window.location.href);
  return currentSiteHandler !== null;
}

// Function to get property information using the appropriate site handler
function getPropertyInfo() {
  if (!currentSiteHandler) {
    if (!initializeSiteHandler()) {
      console.error('No site handler available for this website');
      return { propertyAddress: null, agentName: null, agentEmail: null };
    }
  }

  return {
    propertyAddress: currentSiteHandler.getPropertyAddress(),
    agentName: currentSiteHandler.getAgentName(),
    agentEmail: currentSiteHandler.getAgentEmail()
  };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPropertyAndAgentInfo') {
    try {
      const propertyInfo = getPropertyInfo();
      
      sendResponse({
        propertyAddress: propertyInfo.propertyAddress,
        agentName: propertyInfo.agentName,
        agentEmail: propertyInfo.agentEmail
      });
    } catch (error) {
      console.error('Error getting property info:', error);
      sendResponse({
        propertyAddress: null,
        agentName: null,
        agentEmail: null,
        error: error.message
      });
    }
  }
  return true; // Keep the message channel open for asynchronous response
});

// Check if the current property has been contacted before
function checkContactedProperty() {
  try {
    const propertyInfo = getPropertyInfo();
    
    if (!propertyInfo || !propertyInfo.propertyAddress) {
      console.log('No property info available to check');
      return;
    }
    
    // Create a unique identifier for the property
    const propertyId = propertyInfo.propertyAddress.trim().toLowerCase();
    
    // Load contacted properties from storage
    chrome.storage.local.get({ contactedProperties: {} }, (result) => {
      const contactedProperties = result.contactedProperties || {};
      
      // Check if this property is in the list
      if (contactedProperties[propertyId]) {
        console.log('Property was previously contacted:', propertyInfo.propertyAddress);
        
        // Get the contact info
        const contactInfo = contactedProperties[propertyId];
        const contactDate = new Date(contactInfo.lastContacted);
        const formattedDate = contactDate.toLocaleDateString();
        const contactType = contactInfo.contactType === 'sent' ? 'sent' : 'prepared';
        const timesContacted = contactInfo.timesContacted || 1;
        
        // Show a persistent banner
        showContactedBanner(contactType, formattedDate, timesContacted);
      }
    });
  } catch (error) {
    console.error('Error checking if property was contacted:', error);
  }
}

// Show a persistent banner for previously contacted properties
function showContactedBanner(contactType, date, times) {
  // Remove any existing banner first
  const existingBanner = document.getElementById('realty-reach-contacted-banner');
  if (existingBanner) {
    existingBanner.remove();
  }
  
  // Create the banner element
  const banner = document.createElement('div');
  banner.id = 'realty-reach-contacted-banner';
  banner.style.position = 'fixed';
  banner.style.top = '0';
  banner.style.left = '0';
  banner.style.right = '0';
  banner.style.backgroundColor = '#006AFF';
  banner.style.color = 'white';
  banner.style.padding = '10px 20px';
  banner.style.zIndex = '10000000';
  banner.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  banner.style.display = 'flex';
  banner.style.justifyContent = 'space-between';
  banner.style.alignItems = 'center';
  banner.style.fontFamily = 'Arial, sans-serif';
  
  // Create the message text
  const messageText = document.createElement('div');
  messageText.innerHTML = `
    <strong>✓ RealtyReach:</strong> You have already ${contactType} an email for this property on ${date}
    ${times > 1 ? `<span>(contacted ${times} times)</span>` : ''}
  `;
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.color = 'white';
  closeButton.style.fontSize = '16px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.padding = '0 5px';
  closeButton.addEventListener('click', () => {
    banner.remove();
  });
  
  // Add elements to the banner
  banner.appendChild(messageText);
  banner.appendChild(closeButton);
  
  // Add banner to the page
  document.body.appendChild(banner);
}

// We could add a small UI indicator when the extension is active on a supported site
function addExtensionIndicator() {
  const indicator = document.createElement('div');
  indicator.style.position = 'fixed';
  indicator.style.bottom = '20px';
  indicator.style.right = '20px';
  indicator.style.backgroundColor = '#006AFF';
  indicator.style.color = 'white';
  indicator.style.padding = '8px 12px';
  indicator.style.borderRadius = '4px';
  indicator.style.zIndex = '9999';
  indicator.style.fontSize = '14px';
  indicator.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  indicator.style.cursor = 'pointer';
  indicator.textContent = '📧 RealtyReach Ready';
  
  indicator.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
  
  document.body.appendChild(indicator);
  
  // Hide after 5 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.style.transition = 'opacity 0.5s';
    
    // Remove from DOM after fade out
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 500);
  }, 5000);
}

// Run when page loads
window.addEventListener('load', () => {
  // Initialize site handler
  if (initializeSiteHandler()) {
    // Only add the indicator if we detect we're on a supported property page
    if (currentSiteHandler.getPropertyAddress()) {
      // Check if property was previously contacted
      checkContactedProperty();
      
      // Add the extension indicator
      addExtensionIndicator();
    }
  }
}); 