import promptSync from 'prompt-sync';
import chalk from 'chalk';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

export const prompt = promptSync({ sigint: true });

const actionErrorHandler = (error: Error): void => {
  console.error(chalk.red(error.message));
  process.exit(1);
};

export const actionRunner = (fn: (...args) => Promise<void>) => {
  return async (...args) => await fn(...args).catch(actionErrorHandler);
};

export const serializeError = (e: unknown): string => {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  return JSON.stringify(e);
};

interface ClaimDetails {
  amount: string;
  merchant: string;
  purchaseDate: string;
  description: string;
  benefit: string;
  category: string;
}

export const editClaimDetails = (details: ClaimDetails): ClaimDetails => {
  const tmpFile = join(tmpdir(), `formanator-edit-${Date.now()}.txt`);
  const fields: (keyof ClaimDetails)[] = [
    'amount',
    'merchant',
    'purchaseDate',
    'description',
    'benefit',
    'category',
  ];

  const content = fields.map((key) => `${key}: ${details[key]}`).join('\n') + '\n';
  writeFileSync(tmpFile, content, 'utf-8');

  const editor = process.env.EDITOR || 'vi';
  try {
    execSync(`${editor} "${tmpFile}"`, { stdio: 'inherit' });

    const edited = readFileSync(tmpFile, 'utf-8');
    const updated = { ...details };

    for (const line of edited.split('\n')) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match && fields.includes(match[1] as keyof ClaimDetails)) {
        updated[match[1] as keyof ClaimDetails] = match[2].trim();
      }
    }

    return updated;
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore cleanup errors
    }
  }
};
