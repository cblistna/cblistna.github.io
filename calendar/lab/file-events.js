// Main function to parse a filename into a calendar event
export function parseFilenameToEvent(filename) {
  // Split by underscore to get sections
  const sections = filename.split('_');
  
  // Get the date/time section
  const dateSection = sections[0] || '';
  
  // Get subject section
  const subjectSection = sections[1] || '';
  
  // Get body section
  const body = sections[2] ? sections[2].trim() : '';
  
  // Get attachment section
  const attachment = sections[3] || '';
  
  // Parse dates
  const { startDate, endDate } = parseDateSection(dateSection);
  
  // Parse subject and tags
  const { subject, tags } = parseSubjectAndTags(subjectSection);
  
  // Return the event object
  return {
    startDate,
    endDate,
    subject,
    tags,
    body,
    attachments: attachment ? [attachment] : []
  };
}

// Parse the date section (first section)
function parseDateSection(dateSection) {
  const parts = dateSection.split(',');
  const startDateStr = parts[0] ? parts[0].trim() : '';
  const endDateStr = parts.length > 1 ? parts[1].trim() : '';

  const startDate = parseDateString(startDateStr);
  const endDate = parseDateString(endDateStr);
  
  return { startDate, endDate };
}

// Parse a date string in format 'yyyy-MM-dd hh:mm' or 'yyyy-MM-dd'
function parseDateString(dateStr) {
  if (!dateStr) return null;
  
  if (dateStr.includes(' ')) {
    // Has time component
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    return new Date(year, month - 1, day, hours, minutes);
  } else {
    // Date only
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}

// Parse subject and extract tags
function parseSubjectAndTags(subjectSection) {
  if (!subjectSection) return { subject: '', tags: {} };
  
  const tagRegex = /#([^:#\s]+)(?::([^#\s]+))?/g;
  let subject = subjectSection;
  const tags = {};
  
  // Extract tags
  let match;
  while ((match = tagRegex.exec(subjectSection)) !== null) {
    const tagName = match[1];
    const tagValue = match[2] !== undefined ? match[2] : true;
    tags[tagName] = tagValue;
  }
  
  // Remove all tags from subject
  subject = subject.replace(tagRegex, '').trim().replace(/\s+/g, ' ');
  
  return { subject, tags };
}
// Function to group filenames into events
export function groupFilesToEvents(filenames) {
  // First, group files by sections 1 & 2
  const groups = {};
  
  filenames.forEach(filename => {
    const sections = filename.split('_');
    const key = `${sections[0] || ''}|${sections[1] || ''}`;
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push(filename);
  });
  
  // Then process each group
  const events = [];
  
  Object.values(groups).forEach(group => {
    if (group.length === 1) {
      // Single file - parse as is
      events.push(parseFilenameToEvent(group[0]));
    } else {
      // Multiple files with same sections 1 & 2
      
      // Check if all have empty body (section 3)
      const allHaveEmptyBody = group.every(filename => {
        const sections = filename.split('_');
        return !sections[2] || sections[2].trim() === '';
      });
      
      if (allHaveEmptyBody) {
        // All files form attachments to a single event
        const baseEvent = parseFilenameToEvent(group[0]);
        
        // Collect all attachments
        const allAttachments = group.map(filename => {
          const sections = filename.split('_');
          return sections[3] || '';
        }).filter(att => att !== '');
        
        baseEvent.attachments = allAttachments;
        events.push(baseEvent);
      } else {
        // Not all have empty body - treat as separate events
        group.forEach(filename => {
          events.push(parseFilenameToEvent(filename));
        });
      }
    }
  });
  
  return events;
}
