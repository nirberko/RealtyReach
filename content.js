// Function to extract property address from the Zillow page
function getPropertyAddress() {
  // More resilient approach - try selecting by element type and semantic attributes first
  
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

// Function to extract agent information
function getAgentInfo() {
  let agentName = null;
  let agentEmail = null;
  let agentPhone = null;

  // 1. First approach: Look for "Listing Provided by" text which is a reliable marker
  const listingProvidedElements = Array.from(document.querySelectorAll('*'))
    .filter(el => el.textContent && el.textContent.trim() === 'Listing Provided by:');

  if (listingProvidedElements.length > 0) {
    console.log("Found 'Listing Provided by' element");
    
    // Get the parent container which likely contains all agent info
    for (const element of listingProvidedElements) {
      // Look for parent container that has the agent info
      let container = element.parentElement;
      // Sometimes we need to go up one more level or look at adjacent elements
      if (container) {
        // Examine the container and its children for agent info
        const fullText = container.textContent.trim();
        console.log("Agent container text:", fullText);
        
        // Extract email using regex
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
        const emailMatch = fullText.match(emailRegex);
        if (emailMatch) {
          agentEmail = emailMatch[0];
          console.log("Found agent email:", agentEmail);
        }
        
        // Extract phone using regex
        const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
        const phoneMatch = fullText.match(phoneRegex);
        if (phoneMatch) {
          agentPhone = phoneMatch[0];
          console.log("Found agent phone:", agentPhone);
        }
        
        // Look for agent name in specific data-testid elements
        const agentElements = container.querySelectorAll('[data-testid*="attribution-LISTING_AGENT"]');
        if (agentElements.length > 0) {
          // Get all spans inside the agent element to find the name
          const spans = agentElements[0].querySelectorAll('span');
          if (spans.length > 0) {
            // First span usually contains the agent name
            agentName = spans[0].textContent.trim();
            console.log("Found agent name from span:", agentName);
          } else {
            // Fallback: use the text content of the agent element
            const agentText = agentElements[0].textContent.trim();
            // If we have email or phone, extract name as everything before them
            if (agentEmail || agentPhone) {
              let endIndex = agentText.length;
              if (agentEmail) endIndex = Math.min(endIndex, agentText.indexOf(agentEmail));
              if (agentPhone) endIndex = Math.min(endIndex, agentText.indexOf(agentPhone));
              
              agentName = agentText.substring(0, endIndex).trim();
              // Clean up any trailing characters
              agentName = agentName.replace(/[,.:;]?\s*$/, '');
            } else {
              // If no clear way to separate, just take the first part
              const parts = agentText.split(/[,\s]+/);
              if (parts.length >= 2) {
                // Assume first two parts are first name and last name
                agentName = parts.slice(0, 2).join(' ');
              } else {
                agentName = parts[0];
              }
            }
            console.log("Found agent name from text:", agentName);
          }
        }
      }
      
      // If we found the info, we're done
      if (agentName && agentEmail) {
        break;
      }
    }
  }
  
  // 2. If the first approach didn't work, fall back to our more general approaches
  if (!agentName || !agentEmail) {
    console.log("Falling back to general methods to find agent info");
    
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
    const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
    const nameRegex = /([A-Z][a-z]+(?: [A-Z][a-z]+)+)/; // Basic pattern for names like "John Smith"
    
    // Examine agent sections for contact info
    for (const section of agentSections) {
      const sectionText = section.textContent.trim();
      if (!sectionText) continue;
      
      console.log("Examining potential agent section:", sectionText);
      
      // Extract email
      if (!agentEmail) {
        const emailMatch = sectionText.match(emailRegex);
        if (emailMatch) {
          agentEmail = emailMatch[0];
          console.log("Found email:", agentEmail);
        }
      }
      
      // Extract phone
      if (!agentPhone) {
        const phoneMatch = sectionText.match(phoneRegex);
        if (phoneMatch) {
          agentPhone = phoneMatch[0];
          console.log("Found phone:", agentPhone);
        }
      }
      
      // Extract name - more complex, use several heuristics
      if (!agentName) {
        // Try common name pattern (e.g., "John Smith")
        const nameMatch = sectionText.match(nameRegex);
        
        if (nameMatch) {
          // Verify it's not part of a longer phrase
          const potentialName = nameMatch[0];
          const lowerText = sectionText.toLowerCase();
          // Avoid matching phrases like "Contact Agent" as names
          if (!agentSectionKeywords.some(keyword => 
            potentialName.toLowerCase().includes(keyword))) {
            agentName = potentialName;
            console.log("Found name via pattern:", agentName);
          }
        }
      }
    }
  }
  
  // 3. Additional fallback: check for mailto links
  if (!agentEmail) {
    const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
    if (emailLinks.length > 0) {
      const href = emailLinks[0].getAttribute('href');
      if (href.startsWith('mailto:')) {
        agentEmail = href.substring(7).split('?')[0];
      }
    }
  }

  // 4. If we still don't have an email but have an agent name,
  // we'll create a placeholder that the user can replace
  if (!agentEmail && agentName) {
    agentEmail = 'agent.email@example.com (Please replace with actual email)';
  }

  return { agentName, agentEmail };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPropertyAndAgentInfo') {
    const propertyAddress = getPropertyAddress();
    const { agentName, agentEmail } = getAgentInfo();
    
    sendResponse({
      propertyAddress,
      agentName,
      agentEmail
    });
  }
  return true; // Keep the message channel open for asynchronous response
});

// We could add a small UI indicator when the extension is active on Zillow
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
  indicator.textContent = '📧 Zillow Agent Emailer Ready';
  
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
  // Only add the indicator if we detect we're on a property page
  if (getPropertyAddress()) {
    addExtensionIndicator();
  }
}); 