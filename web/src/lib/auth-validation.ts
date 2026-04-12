export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  if (email.length < 3 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(plain: string): string | null {
  if (plain.length < 8) return "Ο κωδικός χρειάζεται τουλάχιστον 8 χαρακτήρες";
  if (plain.length > 128) return "Ο κωδικός είναι πολύ μεγάλος";
  return null;
}

export function validateDisplayName(name: string): string | null {
  const t = name.trim();
  if (t.length < 2) return "Το όνομα χρειάζεται τουλάχιστον 2 χαρακτήρες";
  if (t.length > 80) return "Το όνομα είναι πολύ μεγάλο";
  return null;
}

export function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function validateBrokerCompanyName(name: string): string | null {
  const t = name.trim();
  if (t.length < 2) return "Η επωνυμία χρειάζεται τουλάχιστον 2 χαρακτήρες";
  if (t.length > 120) return "Η επωνυμία είναι πολύ μεγάλη";
  return null;
}

export function validateBrokerPhoneDigits(digits: string): string | null {
  if (digits.length < 10) return "Το τηλέφωνο χρειάζεται τουλάχιστον 10 ψηφία";
  if (digits.length > 15) return "Το τηλέφωνο δεν είναι έγκυρο";
  return null;
}
