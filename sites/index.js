/**
 * Site factory module for dynamically loading the appropriate site handler
 */

// Import site handlers
// Note: In a content script context, these would be loaded via the manifest
// For browser context, site-specific scripts should be loaded before this one

/**
 * Get the appropriate site handler based on the current URL
 * @param {string} url - The current page URL
 * @returns {Object|null} - The site handler instance or null if not supported
 */
function getSiteHandler(url) {
  if (!url) {
    // If no URL is provided, try to get it from the current page
    url = window.location.href;
  }

  // Determine which site we're on
  if (url.includes('zillow.com')) {
    return new window.ZillowSite();
  }
  
  // Add more site handlers here as they are implemented
  // Example:
  // if (url.includes('realtor.com')) {
  //   return new window.RealtorSite();
  // }

  // No supported site handler found
  return null;
}

// Export for module context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getSiteHandler };
} else {
  // For browser context
  window.siteFactory = { getSiteHandler };
} 