require('dotenv').config();
const Airtable = require('airtable');
const base = new Airtable().base(process.env.AIRTABLE_COWORKING_BASE);
var fs = require('fs');
const path = require('path');

async function main() {
  console.log('Building rooms');
  const results = await base('rooms').select().all();

  const rooms = results.map((record) => ({
    ...record.fields,
    record_id: record.id,
  }));

  fs.writeFileSync(
    path.resolve(__dirname, '..', 'data', 'rooms.json'),
    JSON.stringify(rooms, null, 2)
  );

  console.log(`Done building ${rooms.length} rooms`);
}

main();
