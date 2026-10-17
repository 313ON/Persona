import fs from 'node:fs';
import readline from 'node:readline';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const TARGET_EMAIL = 'bakhtarni@gmail.com';
const MIN_PASSWORD_LENGTH = 12;

function loadLocalEnv(): void {
  const envPath = '.env';
  if (!fs.existsSync(envPath)) throw new Error('Local .env is required');
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator);
    if (process.env[key]) continue;
    let value = trimmed.slice(separator + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

function assertLocalDevelopmentDatabase(): void {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const databaseUrl = new URL(process.env.DATABASE_URL);
  const databaseName = databaseUrl.pathname.replace(/^\//, '').split('?')[0];
  if (databaseName !== 'charb_personnel_dev' || !['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname.toLowerCase())) {
    throw new Error('This command is restricted to the local charb_personnel_dev database');
  }
}

async function readHidden(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('A secure interactive terminal is required');
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  process.stdout.write(label);
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error?: Error) => {
      stdin.setRawMode(false);
      stdin.pause();
      input.close();
      process.stdout.write('\n');
      if (error) reject(error); else resolve(value);
    };
    const onData = (chunk: Buffer) => {
      for (const byte of chunk) {
        if (byte === 3) return finish(new Error('Input cancelled'));
        if (byte === 13 || byte === 10) return finish();
        if (byte === 8 || byte === 127) value = value.slice(0, -1);
        else if (byte >= 32) value += String.fromCharCode(byte);
      }
    };
    stdin.on('data', onData);
  });
}

async function main(): Promise<void> {
  loadLocalEnv();
  assertLocalDevelopmentDatabase();
  const password = await readHidden('New local password: ');
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) throw new Error('Password must be between 12 and 200 characters');
  const confirmation = await readHidden('Confirm local password: ');
  if (password !== confirmation) throw new Error('Passwords do not match');

  const db = new PrismaClient();
  try {
    const users = await db.user.findMany({ where: { email: TARGET_EMAIL }, select: { id: true, role: true, isActive: true } });
    if (users.length !== 1) throw new Error('Expected exactly one active target account');
    if (!users[0].isActive || users[0].role !== 'SUPER_ADMIN') throw new Error('Target account is not an active SUPER_ADMIN');
    const passwordHash = await argon2.hash(password);
    await db.user.update({ where: { id: users[0].id }, data: { passwordHash } });
    console.log('Local administrator password updated.');
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Local administrator reset failed');
  process.exitCode = 1;
});
