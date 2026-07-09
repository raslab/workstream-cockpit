import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock-url';
}

if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => {};
}
