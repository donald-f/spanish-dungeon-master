// PII (Personally Identifiable Information) detection utilities
// Used for both client-side and server-side validation

export interface PIIValidationResult {
  isValid: boolean;
  errors: string[];
  detectedTypes: PIIType[];
}

export type PIIType = 'email' | 'phone' | 'ssn' | 'contact_pattern';

// Email regex - matches common email patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Phone number patterns - US and international formats (more strict to avoid false positives)
const PHONE_PATTERNS = [
  // US formats with explicit separators: (555) 123-4567, 555-123-4567, 555.123.4567
  /(?:\+?1[-.\s])?\([0-9]{3}\)[-.\s][0-9]{3}[-.\s][0-9]{4}/g,
  /(?:\+?1[-.\s])?[0-9]{3}[-.\s][0-9]{3}[-.\s][0-9]{4}/g,
  // International with + prefix: +34 612 345 678
  /\+[0-9]{1,3}[\s-][0-9]{2,4}[\s-][0-9]{3,4}[\s-][0-9]{3,4}/g,
];

// SSN patterns: 123-45-6789, 123 45 6789 (requires explicit separators)
const SSN_REGEX = /\b[0-9]{3}[-\s][0-9]{2}[-\s][0-9]{4}\b/g;

// Contact-me patterns with digits (trying to share contact info)
const CONTACT_PATTERNS = [
  // "contact me at" + digits
  /(?:contact|contacta|llam|llama|escrib|mensaje|whatsapp|telegram|text|call)(?:a|e|me|ar)?[\s:@]*[\d\s]{7,}/gi,
  // "my number is" patterns
  /(?:mi|my)\s*(?:numero|number|tel|telefono|phone|whatsapp)[\s:is]*[\d\s-().]{7,}/gi,
  // Direct "add me" with numbers
  /(?:add|agregar|agrégame)[\s:]*[a-zA-Z]*[\s:]*[\d]{5,}/gi,
];

// Instagram/social handles that look like they're sharing contact (only match explicit sharing patterns)
const SOCIAL_CONTACT_PATTERNS = [
  // Only match @username when preceded by "find me" or "contact" style text
  /(?:find|encuentra|follow|sígueme|contact|add)[\s:]*@[a-zA-Z0-9._]{3,30}/gi,
  /(?:instagram|insta|twitter|facebook|snap|snapchat|tiktok|discord)[\s:@]+[a-zA-Z0-9._]{3,30}/gi,
];

function detectEmails(text: string): string[] {
  return text.match(EMAIL_REGEX) || [];
}

function detectPhones(text: string): string[] {
  const phones: string[] = [];
  for (const pattern of PHONE_PATTERNS) {
    const matches = text.match(pattern) || [];
    phones.push(...matches);
  }
  // Remove duplicates and filter out things that are likely not phones
  return Array.from(new Set(phones)).filter(p => {
    const digitsOnly = p.replace(/\D/g, '');
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  });
}

function detectSSNs(text: string): string[] {
  const matches = text.match(SSN_REGEX) || [];
  // Filter out unlikely SSNs (all same digits, etc.)
  return matches.filter(ssn => {
    const digits = ssn.replace(/\D/g, '');
    // SSN cannot start with 000, 666, or 900-999
    const firstThree = parseInt(digits.substring(0, 3));
    if (firstThree === 0 || firstThree === 666 || firstThree >= 900) {
      return false;
    }
    // Middle two digits cannot be 00
    if (digits.substring(3, 5) === '00') return false;
    // Last four cannot be 0000
    if (digits.substring(5, 9) === '0000') return false;
    return true;
  });
}

function detectContactPatterns(text: string): string[] {
  const contacts: string[] = [];
  for (const pattern of CONTACT_PATTERNS) {
    const matches = text.match(pattern) || [];
    contacts.push(...matches);
  }
  for (const pattern of SOCIAL_CONTACT_PATTERNS) {
    const matches = text.match(pattern) || [];
    contacts.push(...matches);
  }
  return Array.from(new Set(contacts));
}

export function validateNoPII(text: string): PIIValidationResult {
  const errors: string[] = [];
  const detectedTypes: PIIType[] = [];
  
  const emails = detectEmails(text);
  if (emails.length > 0) {
    detectedTypes.push('email');
    errors.push('Se detectó una dirección de correo electrónico');
  }
  
  const phones = detectPhones(text);
  if (phones.length > 0) {
    detectedTypes.push('phone');
    errors.push('Se detectó un número de teléfono');
  }
  
  const ssns = detectSSNs(text);
  if (ssns.length > 0) {
    detectedTypes.push('ssn');
    errors.push('Se detectó información sensible (posible número de identificación)');
  }
  
  const contacts = detectContactPatterns(text);
  if (contacts.length > 0) {
    detectedTypes.push('contact_pattern');
    errors.push('Se detectó un intento de compartir información de contacto');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    detectedTypes,
  };
}

// Quick check for common PII - faster than full validation
export function containsPII(text: string): boolean {
  return !validateNoPII(text).isValid;
}

// Spanish-friendly error message for users
export function getPIIErrorMessage(result: PIIValidationResult): string {
  if (result.isValid) return '';
  
  const baseMessage = 'Por favor, no incluyas información personal en tu mensaje. ';
  const specifics = result.errors.join('. ');
  return baseMessage + specifics + '. Reformula tu mensaje sin esta información.';
}
