
// Helper for fuzzy search (Levenshtein Distance)
const levenshtein = (a: string, b: string): number => {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  return matrix[b.length][a.length];
};

export const fuzzyMatch = (text: string | undefined, search: string): boolean => {
  if (!search) return true;
  if (!text) return false;
  
  const cleanText = text.toLowerCase();
  const cleanSearch = search.toLowerCase();

  // 1. Exact substring match (Fast path)
  if (cleanText.includes(cleanSearch)) return true;
  
  // 2. Fuzzy match allowing typos
  // Only apply if search term is at least 2 chars long to avoid noise
  if (cleanSearch.length < 2) return false;

  // Allow 1 error for short words (<= 4 chars), 2 errors for longer words
  const maxErrors = cleanSearch.length > 4 ? 2 : 1;
  
  // Check against the full text if lengths are similar (e.g. Chinese titles)
  if (Math.abs(cleanText.length - cleanSearch.length) <= maxErrors + 1) {
      if (levenshtein(cleanText, cleanSearch) <= maxErrors) return true;
  }

  // Check against individual words (e.g. English titles)
  // Split by whitespace and common punctuation
  const words = cleanText.split(/[\s\-_：:，,。]+/); 
  
  return words.some(word => {
      // Optimization: length difference check
      if (Math.abs(word.length - cleanSearch.length) > maxErrors) return false;
      return levenshtein(cleanSearch, word) <= maxErrors;
  });
};
