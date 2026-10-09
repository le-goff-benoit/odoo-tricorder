'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {prepare} = require('../harness.cjs');

const output = __dirname;
const manifest = prepare({id:'terminal-suivi', output, display:183});
const fixtures = [
  ['atelier-azur', 'Atelier Azur — projet synthétique',
    'R1 : Collecter trois libellés de démonstration. Critère : une liste de trois libellés.\n' +
    'R2 : Choisir un libellé de démonstration. Dépend de R1. Critère : un choix et son motif.\n' +
    'R4 : Relire la cohérence des deux projets. Dépend de R2 et de R3 du projet Laboratoire Corail. Critère : décision explicite de validation ou reprise.\n'],
  ['laboratoire-corail', 'Laboratoire Corail — projet synthétique',
    'R3 : Préparer une variante de démonstration à partir du choix R2 du projet Atelier Azur. Dépend de R2. Critère : une variante nommée.\n']
];
for (const [name,title,requests] of fixtures) {
  const target = path.join(manifest.dirs.project,name);
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target,'README.md'), '# '+title+'\n\n' +
    'Fixture UX inventée. Aucun client, aucune donnée métier, aucun modèle exécuté.\n' +
    'Ces demandes décrivent des intentions ; elles ne prouvent aucun état d’exécution.\n\n'+requests);
}
manifest.externalFixtures = 'Deux dossiers et README synthétiques : atelier-azur et laboratoire-corail. Aucun workflow ni état Engine précréé.';
manifest.fixtureProjects = fixtures.map(([name]) => path.join(manifest.dirs.project,name));
fs.writeFileSync(path.join(output,'terminal-suivi-preparation.json'),JSON.stringify(manifest,null,2)+'\n');
process.stdout.write(JSON.stringify({temporary:manifest.temporary, projects:manifest.fixtureProjects, preflight:manifest.preflight, guiStarted:manifest.guiStarted, brokerStarted:manifest.brokerStarted},null,2)+'\n');
