const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { buildV2Prompt } = require('../electron/workflow-prompt.cjs');
const catalog = require('../electron/workflow-states.json');

test('schema-2 coordination keeps intentions and plan elements in one family', () => {
  const text = buildV2Prompt({ definition: { schema: 2, title: 'Réunion et suivi' }, project_contexts: [{ id: 'p1', path: '/synthetic/project' }] }, 'synthetic-bridge');
  assert.match(text, /agent coordinateur/);
  assert.match(text, /Pont : synthetic-bridge/);
  assert.match(text, /collect: \{run,node,revision,operation:/);
  assert.match(text, /add sert à une nouvelle exécution indépendante/);
  assert.match(text, /iterate: \{run,node\}/);
  assert.match(text, /children: \{run,node,offset\?,limit\?\}/);
  assert.match(text, /ne recopie pas le recueil et le plan dans chaque enfant/);
  assert.match(text, /Aucune commande du pont n’accorde une décision humaine/);
  assert.match(text, /QA du candidat commun/);
  assert.match(text, /sans empêcher le résultat principal de se terminer/);
  assert.match(text, /\/synthetic\/project/);
  assert.doesNotMatch(text, /enregistre chaque demande métier avec add/);
});

test('legacy conversations keep their original prompt path', () => {
  assert.throws(() => buildV2Prompt({ definition: { schema: 1 } }, 'bridge'), /schéma 2/);
  const main = fs.readFileSync(require.resolve('../electron/main.cjs'), 'utf8');
  assert.match(main, /const prompt = conversation\.definition\.schema === 2 \? require\('\.\/workflow-prompt\.cjs'\)\.buildV2Prompt\(conversation, command\) : `Tu pilotes le workflow Tricorder/);
  assert.match(main, /Après validation du périmètre de travail, enregistre chaque demande métier avec add et une clé stable/);
});

test('collection and coordination have distinct labels and attention behavior', () => {
  assert.equal(catalog.labels.collecting, 'Recueil ouvert');
  assert.equal(catalog.labels.waiting_children, 'Coordination en cours');
  assert.ok(catalog.priority.includes('collecting'));
  assert.ok(catalog.priority.includes('waiting_children'));
  assert.ok(catalog.attention.includes('collecting'));
  assert.ok(!catalog.attention.includes('waiting_children'));
});
