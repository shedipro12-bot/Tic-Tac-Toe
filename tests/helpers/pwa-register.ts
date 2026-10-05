import { vi } from 'vitest';
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';
export const registerSW = vi.fn((_options: RegisterSWOptions) => async () => {});
