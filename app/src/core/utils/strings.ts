export const toCapitalCase = (word: string) => {
  return word.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const truncateString = (str: string, maxLength: number = 20) =>
  str.substring(0, maxLength) + (str.length > maxLength ? '...' : '');
