import 'dotenv/config';
import Airtable from 'airtable';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.AIRTABLE_COWORKING_BASE) {
  throw new Error('AIRTABLE_COWORKING_BASE environment variable is required');
}

const base = new Airtable().base(process.env.AIRTABLE_COWORKING_BASE);

async function main() {
  console.log('Building rooms');
  const results = await base('rooms').select().all();

  const rooms = results.map((record) => ({
    ...record.fields,
    record_id: record.id,
  }));

  writeFileSync(
    resolve(__dirname, '..', 'data', 'rooms.json'),
    JSON.stringify(rooms, null, 2),
  );

  console.log(`Done building ${rooms.length} rooms`);
}

main();
