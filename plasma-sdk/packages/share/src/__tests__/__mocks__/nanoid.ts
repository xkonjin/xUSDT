/**
 * Mock for nanoid ESM module
 * 
 * Provides a simple customAlphabet implementation for testing
 */

export function customAlphabet(alphabet: string, defaultSize: number) {
  return function nanoid(size: number = defaultSize): string {
    let result = '';
    for (let i = 0; i < size; i++) {
      const randomIndex = Math.floor(Math.random() * alphabet.length);
      result += alphabet[randomIndex];
    }
    return result;
  };
}

export function nanoid(size: number = 21): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < size; i++) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    result += alphabet[randomIndex];
  }
  return result;
}
