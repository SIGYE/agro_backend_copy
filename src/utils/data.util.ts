export function excludeFields(data: any, excludeFields: string[]) {
    excludeFields.forEach((field) => delete data[field]);
    return data;
  }

  export function codeGenerator(): string {
    const code = Math.floor(100000 + Math.random() * 900000);
    return code.toString();
  }

  export const generatePassword = (): string => {
    const length = 10;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+[]{}|;:,.<>?';

    const allCharacters = uppercase + lowercase + numbers + symbols;

    // Helper function to ensure each character type is included
    const getRandomCharacter = (characters: string): string => {
        const randomIndex = Math.floor(Math.random() * characters.length);
        return characters[randomIndex];
    };

    let password = '';
    // Ensure at least one character from each required category
    password += getRandomCharacter(uppercase);
    password += getRandomCharacter(numbers);
    password += getRandomCharacter(symbols);

    // Fill the rest of the password length with random characters
    for (let i = password.length; i < length; i++) {
        password += getRandomCharacter(allCharacters);
    }

    // Shuffle the password to mix up the required characters
    password = password.split('').sort(() => Math.random() - 0.5).join('');

    return password;
};
