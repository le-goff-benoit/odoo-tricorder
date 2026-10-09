'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {prepare} = require('../harness.cjs');

const output = __dirname;
const manifest = prepare({id:'navigation-vocabulaire', output, display:181});
const fixtureData = [
  ['coordination-atelier', 'Coordination atelier', 'Préparer une réunion de coordination : recueillir les points, proposer un ordre du jour, obtenir une validation.'],
  ['support-equipement', 'Support équipement', 'Qualifier un incident synthétique de lecteur de badges : symptôme, reproduction locale, décision de traitement.'],
  ['suivi-formation', 'Suivi formation', 'Organiser une session interne fictive : disponibilité, contenu, revue et validation.'],
];
const fixtures = fixtureData.map(([slug,title,description]) => {
  const dir = path.join(manifest.dirs.project,slug);
  fs.mkdirSync(dir, {recursive:true});
  fs.writeFileSync(path.join(dir,'README.md'), '# '+title+'\n\n'+description+'\n\nProjet de test UX synthétique, sans client ni service réel.\n');
  const git = spawnSync('/usr/bin/git',['init','--initial-branch=main',dir],{env:manifest.env,encoding:'utf8'});
  if (git.status !== 0) throw Error('Fixture Git initialization failed: '+git.stderr);
  const remote = spawnSync('/usr/bin/git',['-C',dir,'remote','-v'],{env:manifest.env,encoding:'utf8'});
  if (remote.status !== 0 || remote.stdout.trim()) throw Error('Fixture must have no remote');
  return {slug,title,description,path:dir,workflowPrecreated:false,executionStateCreated:false,gitRemote:false};
});
manifest.fixtures = fixtures;
manifest.externalFixtures = 'Trois dépôts Git synthétiques locaux sans remote ; README seulement, aucun workflow ni état d’exécution précréé.';
fs.writeFileSync(path.join(output,manifest.id+'-preparation.json'), JSON.stringify(manifest,null,2)+'\n');
process.stdout.write(JSON.stringify({id:manifest.id,temporary:manifest.temporary,display:manifest.display,guiStarted:manifest.guiStarted,brokerStarted:manifest.brokerStarted,fixtures,preflight:manifest.preflight},null,2)+'\n');
