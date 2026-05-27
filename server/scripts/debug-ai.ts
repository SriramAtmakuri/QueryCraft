import * as dotenv from 'dotenv';
dotenv.config();
import { generateContent } from '../src/aiProvider';

async function main() {
  const r = await generateContent({ prompt: 'Compare SELECT id FROM users vs SELECT id FROM users WHERE 1=1. Respond ONLY with JSON: {"isEquivalent": true}', temperature: 0.1, maxTokens: 256 });
  console.log('TEXT:', JSON.stringify(r.text));
}
void main();
