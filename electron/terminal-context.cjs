// Cockpit metadata only: never write commands into a PTY or restart its process.
function sessionContext(settings, session) {
  const saved = settings.terminalContexts?.[session.id];
  return saved?.project === session.project ? { ...session, ...saved, launchRelease: session.release } : session;
}
function saveContext(settings, session, release, task = null, scopeMode = 'auto') {
  settings.terminalContexts ||= {};
  settings.terminalContexts[session.id] = { project: session.project, release, task, scopeMode };
  return sessionContext(settings, session);
}
module.exports = { sessionContext, saveContext };
