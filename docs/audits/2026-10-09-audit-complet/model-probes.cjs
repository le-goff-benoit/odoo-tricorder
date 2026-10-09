const fs = require('node:fs');
const path = require('node:path');
const { summarize, menuItems } = require('../../../electron/studio-tray.cjs');
(async () => {
  const { displayGraph, withWorkflowAI } = await import('../../../src/studio-model.js');
  const graph = {schema:1,id:'question-flow',title:'Demande en attente',nodes:[{id:'ask',kind:'question',title:'Information requise',phase:'Analyse'}],edges:[]};
  const run = {id:'r-synthetic',project:'p-synthetic',project_title:'Projet synthétique',status:'active',definition:graph,nodes:{ask:{status:'waiting_input'}}};
  const facts = {
    waitingQuestionTraySummary: summarize([run]),
    waitingQuestionTrayLabel: menuItems([run],()=>{},()=>{},()=>{}).find(item=>item.label?.includes('Projet synthétique')).label,
    waitingQuestionCollapsedPhaseStatus: displayGraph(graph,new Set(['Analyse']),run).nodes[0].status,
    modelChangeWithoutEffortChoice: withWorkflowAI({...graph,defaults:{provider:'codex',model:'old',effort:'low'}},{provider:'claude',model:'new'}).defaults,
  };
  fs.writeFileSync(path.join(__dirname,'model-results.json'),JSON.stringify(facts,null,2)+'\n');
  console.log(JSON.stringify(facts,null,2));
})();
