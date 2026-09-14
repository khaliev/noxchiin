import { defineConfig } from 'vitest/config';

// Конфигурация Vitest — тесты игровой логики и целостности данных.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
