/**
 * Zillow site handler for extracting property and agent information
 */
class ZillowSite {
  /**
   * Extract property address from the Zillow page
   * @returns {string|null} The property address or null if not found
   */
  getPropertyAddress() {
    // 1. Try to find h1 elements that likely contain the address
    const h1Elements = document.querySelectorAll('h1');
    for (const h1 of h1Elements) {
      // Property addresses typically contain digits (street numbers) and text
      const text = h1.textContent.trim();
      // Only consider non-empty h1s that look like addresses (contain numbers and commas)
      if (text && /\d/.test(text) && text.includes(',')) {
        return text;
      }
    }

    // 2. Try common data attributes that might contain address info
    const dataAttributeSelectors = [
      '[data-testid="home-details-summary-address"]',
      '[data-testid*="address"]',
      '[data-testid*="property"]',
      '[aria-label*="address"]',
      '[class*="address"]'
    ];

    for (const selector of dataAttributeSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.trim();
        if (text && /\d/.test(text) && text.includes(',')) {
          return text;
        }
      }
    }

    // 3. Try classes that might contain the address
    const classSelectors = [
      '.ds-address',
      '.address',
      '.property-address',
      '.home-address',
      '.streetAddress',
      '.hdp__sc-5vi1hi-0'
    ];

    for (const selector of classSelectors) {
      const addressElement = document.querySelector(selector);
      if (addressElement && addressElement.textContent.trim()) {
        return addressElement.textContent.trim();
      }
    }

    // 4. Fallback: Try to extract from the page title
    const titleMatch = document.title.match(/(.*?)\s*-\s*Zillow/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }

    return null;
  }

  /**
   * Extract agent name from the Zillow page
   * @returns {string|null} The agent name or null if not found
   */
  getAgentName() {
    // 1. Look for "Listing Provided by" text which is a reliable marker
    const listingProvidedElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent && el.textContent.trim() === 'Listing Provided by:');

    if (listingProvidedElements.length > 0) {
      // Get the parent container which likely contains all agent info
      for (const element of listingProvidedElements) {
        // Look for parent container that has the agent info
        let container = element.parentElement;
        // Sometimes we need to go up one more level or look at adjacent elements
        if (container) {
          // Look for agent name in specific data-testid elements
          const agentElements = container.querySelectorAll('[data-testid*="attribution-LISTING_AGENT"]');
          if (agentElements.length > 0) {
            // Get all spans inside the agent element to find the name
            const spans = agentElements[0].querySelectorAll('span');
            if (spans.length > 0) {
              // First span usually contains the agent name
              return spans[0].textContent.trim();
            } else {
              // Fallback: use the text content of the agent element
              const agentText = agentElements[0].textContent.trim();
              // If we can extract name as everything before email or phone
              const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
              const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
              
              const emailMatch = agentText.match(emailRegex);
              const phoneMatch = agentText.match(phoneRegex);
              
              if (emailMatch || phoneMatch) {
                let endIndex = agentText.length;
                if (emailMatch) endIndex = Math.min(endIndex, agentText.indexOf(emailMatch[0]));
                if (phoneMatch) endIndex = Math.min(endIndex, agentText.indexOf(phoneMatch[0]));
                
                let name = agentText.substring(0, endIndex).trim();
                // Clean up any trailing characters
                name = name.replace(/[,.:;]?\s*$/, '');
                return name;
              } else {
                // If no clear way to separate, just take the first part
                const parts = agentText.split(/[,\s]+/);
                if (parts.length >= 2) {
                  // Assume first two parts are first name and last name
                  return parts.slice(0, 2).join(' ');
                } else {
                  return parts[0];
                }
              }
            }
          }
        }
      }
    }
    
    // 2. If the first approach didn't work, fall back to more general approaches
    // Look for sections with agent-related heading text
    const agentSectionKeywords = [
      'agent', 'contact', 'listing provided by', 'listed by', 'listing courtesy of',
      'listing agent', 'seller\'s agent', 'listing by', 'represented by'
    ];
    
    // Find headers/labels that might indicate agent sections
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p, label');
    let agentSections = [];
    
    // First pass: find headers/labels related to agents
    for (const el of headingElements) {
      const text = el.textContent.trim().toLowerCase();
      if (text && agentSectionKeywords.some(keyword => text.includes(keyword))) {
        // Found a potential agent section header
        // Add the header's parent or siblings as candidate agent info sections
        if (el.nextElementSibling) {
          agentSections.push(el.nextElementSibling);
        }
        // Also check parent's children (siblings of the header)
        if (el.parentElement) {
          for (const child of el.parentElement.children) {
            if (child !== el) {
              agentSections.push(child);
            }
          }
          // Also add the parent itself as a candidate section
          agentSections.push(el.parentElement);
        }
      }
    }
    
    // Define regex pattern for extracting names
    const nameRegex = /([A-Z][a-z]+(?: [A-Z][a-z]+)+)/; // Basic pattern for names like "John Smith"
    
    // Examine agent sections for agent name
    for (const section of agentSections) {
      const sectionText = section.textContent.trim();
      if (!sectionText) continue;
      
      // Try common name pattern (e.g., "John Smith")
      const nameMatch = sectionText.match(nameRegex);
      
      if (nameMatch) {
        // Verify it's not part of a longer phrase
        const potentialName = nameMatch[0];
        // Avoid matching phrases like "Contact Agent" as names
        if (!agentSectionKeywords.some(keyword => 
          potentialName.toLowerCase().includes(keyword))) {
          return potentialName;
        }
      }
    }

    return null;
  }

  /**
   * Extract agent email from the Zillow page
   * @returns {string|null} The agent email or null if not found
   */
  getAgentEmail() {
    // 1. Look for "Listing Provided by" text which is a reliable marker
    const listingProvidedElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent && el.textContent.trim() === 'Listing Provided by:');

    if (listingProvidedElements.length > 0) {
      // Get the parent container which likely contains all agent info
      for (const element of listingProvidedElements) {
        // Look for parent container that has the agent info
        let container = element.parentElement;
        // Sometimes we need to go up one more level or look at adjacent elements
        if (container) {
          // Examine the container and its children for agent info
          const fullText = container.textContent.trim();
          
          // Extract email using regex
          const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
          const emailMatch = fullText.match(emailRegex);
          if (emailMatch) {
            return emailMatch[0];
          }
        }
      }
    }
    
    // 2. If the first approach didn't work, fall back to more general approaches
    // Look for sections with agent-related heading text
    const agentSectionKeywords = [
      'agent', 'contact', 'listing provided by', 'listed by', 'listing courtesy of',
      'listing agent', 'seller\'s agent', 'listing by', 'represented by'
    ];
    
    // Find headers/labels that might indicate agent sections
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p, label');
    let agentSections = [];
    
    // First pass: find headers/labels related to agents
    for (const el of headingElements) {
      const text = el.textContent.trim().toLowerCase();
      if (text && agentSectionKeywords.some(keyword => text.includes(keyword))) {
        // Found a potential agent section header
        // Add the header's parent or siblings as candidate agent info sections
        if (el.nextElementSibling) {
          agentSections.push(el.nextElementSibling);
        }
        // Also check parent's children (siblings of the header)
        if (el.parentElement) {
          for (const child of el.parentElement.children) {
            if (child !== el) {
              agentSections.push(child);
            }
          }
          // Also add the parent itself as a candidate section
          agentSections.push(el.parentElement);
        }
      }
    }
    
    // Define regex patterns for extracting information
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
    
    // Examine agent sections for agent email
    for (const section of agentSections) {
      const sectionText = section.textContent.trim();
      if (!sectionText) continue;
      
      // Extract email
      const emailMatch = sectionText.match(emailRegex);
      if (emailMatch) {
        return emailMatch[0];
      }
    }
    
    // 3. Additional fallback: check for mailto links
    const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
    if (emailLinks.length > 0) {
      const href = emailLinks[0].getAttribute('href');
      if (href.startsWith('mailto:')) {
        return href.substring(7).split('?')[0];
      }
    }

    return null;
  }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZillowSite;
} else {
  // For browser context
  window.ZillowSite = ZillowSite;
} 