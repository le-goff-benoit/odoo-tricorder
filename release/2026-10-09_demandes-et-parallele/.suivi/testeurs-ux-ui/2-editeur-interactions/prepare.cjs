'use strict';
const path = require('node:path');
const {prepare} = require('../harness.cjs');
const manifest = prepare({id:'editeur-interactions',output:__dirname,display:182});
process.stdout.write(JSON.stringify({id:manifest.id, temporary:manifest.temporary,
  manifest:path.join(__dirname,manifest.id+'-preparation.json'),
  guiStarted:manifest.guiStarted, brokerStarted:manifest.brokerStarted})+'\n');
