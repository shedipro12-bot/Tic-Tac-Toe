import type { Server } from 'node:http';
export type HeaderRule = { pattern: string; headers: Record<string, string> };
export function parseHeaders(source: string): HeaderRule[];
export function headersFor(rules: HeaderRule[], pathname: string): Record<string, string>;
export function createStaticServer(directory: string): { server: Server; setDirectory(directory: string): void };
