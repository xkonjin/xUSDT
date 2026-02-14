require("@testing-library/jest-dom");

// Polyfill for TextEncoder/TextDecoder (needed for viem)
const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
