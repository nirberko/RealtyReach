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
      addExtensionIndicator();
    }
  }
}); 