/** Sources supplied for one occurrence, independent of inter-step data ports. */
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const sourceLimits = Object.freeze({files:20, fileBytes:16 * 1024 * 1024, totalBytes:64 * 1024 * 1024, text:80000});
export function meetingSources(graph) {
  return graph?.source_kind === 'meetings' || /meeting|reunion|réunion/i.test(graph?.id || '') || (graph?.nodes || []).some(node=>Object.hasOwn(node.outputs || {},'selected_meetings'));
}
export function sourceForm({draft = {}, graph = {}} = {}) {
  const source=draft.sources && typeof draft.sources==='object'?draft.sources:draft;
  const files=draft.files || source.files || [];
  return `<fieldset class="workflow-sources"><legend>${meetingSources(graph)?'Quelles réunions utiliser ?':'Où se trouve votre demande ?'}</legend><p>Combinez les sources utiles pour cette demande. Elles ne changent pas le modèle.</p>
  <label for="source-text">Texte ou notes à utiliser</label><textarea id="source-text" data-source-field="text" maxlength="${sourceLimits.text}" placeholder="Collez la demande, le message ou vos notes…">${esc(source.text || '')}</textarea>
  <div class="source-files"><span>Fichiers de cette demande</span><button type="button" data-action="pick-workflow-sources">Ajouter des fichiers</button><small>Plusieurs fichiers possibles · 16 Mio par fichier · 64 Mio au total. Une copie sera conservée avec la demande.</small><ul>${files.map(file=>`<li>${esc(file.name)} <small>${Math.ceil(file.size / 1024)} Kio · copie conservée</small> <button type="button" class="flat" data-action="remove-workflow-source" data-source-id="${esc(file.id)}" aria-label="Retirer ${esc(file.name)}">Retirer</button></li>`).join('')}</ul></div>
  <details ${source.email_reference || source.links?'open':''}><summary>Retrouver un email ou utiliser un lien</summary><label for="source-email-reference">Email à retrouver</label><textarea id="source-email-reference" data-source-field="email_reference" maxlength="4000" placeholder="Expéditeur, objet, date ou lien vers le message…">${esc(source.email_reference || '')}</textarea><small>L’agent devra retrouver le message avec un outil accessible. Cette référence ne signifie pas que l’email a déjà été lu. Vous pouvez aussi coller son contenu ou ajouter le fichier du message.</small><label for="source-links">Liens ou références de documents</label><textarea id="source-links" data-source-field="links" maxlength="8000" placeholder="Un lien ou une référence par ligne…">${esc(source.links || '')}</textarea><small>L’agent vérifiera l’accès et vous demandera le contenu si nécessaire.</small></details>
  ${meetingSources(graph)?`<label for="meeting-selection">Réunions à traiter</label><textarea id="meeting-selection" data-source-field="meeting_selection" maxlength="4000" placeholder="Nom et date des réunions concernées ; indiquez à quelles réunions correspondent les fichiers…">${esc(source.meeting_selection || '')}</textarea><label for="meeting-period">Période et périmètre, si vous souhaitez retrouver plusieurs réunions</label><input id="meeting-period" data-source-field="meeting_period" maxlength="600" placeholder="Ex. équipe commerciale, semaine du 5 octobre" value="${esc(source.meeting_period || '')}"><small>Si plusieurs réunions correspondent à votre demande, l’agent vous fera préciser la sélection avant leur analyse.</small>`:''}
  </fieldset>`;
}
export function readSourceDraft(container, files = []) {
  const get=key=>container.querySelector(`[data-source-field="${key}"]`)?.value?.trim() || '';
  return {text:get('text'), email_reference:get('email_reference'), links:get('links'), meeting_selection:get('meeting_selection'), meeting_period:get('meeting_period'), files:structuredClone(files)};
}
export function readSources(container, files = []) {
  return sourcesFromDraft(readSourceDraft(container, files));
}
export function sourcesFromDraft(draft = {}) {
  const text=String(draft.text || '').trim(), email=String(draft.email_reference || '').trim();
  const links=Array.isArray(draft.links)?draft.links.map(String):String(draft.links || '').split('\n').map(x=>x.trim()).filter(Boolean);
  const meetings=String(draft.meeting_selection || '').trim(), period=String(draft.meeting_period || '').trim();
  if(text.length>sourceLimits.text || email.length>4000 || links.join('\n').length>8000 || meetings.length>4000 || period.length>600)throw new Error('Une source dépasse la taille autorisée. Ajoutez plutôt un fichier.');
  const files=(draft.files || []).map(file=>({...file}));
  if(files.length>sourceLimits.files || files.some(file=>!file.id || !file.name || !file.path || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.size) || file.size<0 || file.size>sourceLimits.fileBytes) || files.reduce((sum,file)=>sum+file.size,0)>sourceLimits.totalBytes)throw new Error('La sélection de fichiers dépasse les limites ou contient une copie invalide.');
  const source_context={text, files, email_references:email?[{reference:email,status:'to_retrieve'}]:[], document_references:links.map(reference=>({reference,status:'access_to_check'})), meetings:{selection:meetings,period}};
  const parts=[];
  if(text)parts.push(`Texte et notes fournis :\n${text}`);
  if(files.length)parts.push(`Fichiers fournis (copies conservées ; lire leur contenu avant de les analyser) :\n${files.map(file=>`- ${file.name} : ${file.path} (SHA-256 ${file.sha256})`).join('\n')}`);
  if(email)parts.push(`Email à retrouver avec un outil accessible (message non encore lu) :\n${email}\nSi l’accès manque ou plusieurs messages correspondent, demander le contenu ou une sélection précise.`);
  if(links.length)parts.push(`Documents à retrouver ; vérifier l’accès et demander le contenu si nécessaire :\n${links.map(reference=>'- '+reference).join('\n')}`);
  if(meetings || period)parts.push(`Réunions demandées :\n${meetings || 'À sélectionner à partir du périmètre.'}${period?'\nPériode et périmètre : '+period:''}\nFaire préciser les réunions ambiguës avant leur analyse.`);
  const request=parts.join('\n\n');
  if(request.length>90000)throw new Error('Les sources textuelles sont trop longues pour cette demande. Ajoutez leur contenu sous forme de fichier.');
  return {request, source_context};
}
