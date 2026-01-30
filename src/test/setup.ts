/* eslint-disable @typescript-eslint/no-dynamic-delete */
import { vi } from "vitest";

// Mock globalny dla sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "sessionStorage", {
  value: sessionStorageMock,
});

// Mock globalny dla fetch
global.fetch = vi.fn();

// Setup czyszczący przed każdym testem
beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});
