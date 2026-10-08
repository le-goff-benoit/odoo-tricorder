import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export class WorkflowTerminal {
  constructor(api) {
    this.api = api; this.sessions = new Map(); this.active = null;
    this.host = document.createElement('section'); this.host.className = 'workflow-terminal'; this.host.hidden = true;
    this.host.setAttribute('aria-label', 'Terminal du workflow');
    this.host.innerHTML = '<div class="terminal-heading"><strong>Terminal du workflow</strong><span class="terminal-context"></span><span class="fill"></span><button data-terminal="stop">Terminer la session</button><button data-terminal="hide" aria-label="Masquer le terminal">×</button></div><div class="terminal-description"></div><div class="terminal-body"></div>';
    this.host.querySelector('[data-terminal=hide]').onclick = () => { this.host.hidden = true; };
    this.host.querySelector('[data-terminal=stop]').onclick = () => this.stop().catch(error => this.message(error.message));
    this.api.onTerminal(event => { for (const session of this.sessions.values()) if (session.id === event.session && event.event === 'data') session.term.write(Uint8Array.from(atob(event.data), c => c.charCodeAt(0))); if (event.event === 'disconnected') this.message('Service déconnecté. Rouvrez le terminal pour vous reconnecter.'); });
    this.resize = new ResizeObserver(() => this.fit()); this.resize.observe(this.host);
  }
  mount(workspace) { workspace.append(this.host); }
  detach() { this.host.remove(); }
  message(text) { this.host.querySelector('.terminal-description').textContent = text; }
  async open(project, graph) {
    this.host.hidden = false; this.active = project.id;
    this.host.querySelector('.terminal-context').textContent = project.title;
    this.message(`Conception · ${project.path}/.tricorder · AGENTS.md guide les assistants · workflows/${graph.id}.json · Modifiez le fichier, puis « Recharger et valider ». Les commandes du terminal sont vos actions directes.`);
    let session = this.sessions.get(project.id);
    if (!session) {
      const info = await this.api.terminal({ action: 'create', project: project.id, release: graph.release || null });
      const term = new Terminal({ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, cursorBlink: true, scrollback: 3000, theme: { background: '#151b27', foreground: '#e4eaf5', cursor: '#9caeff' } });
      const fit = new FitAddon(); term.loadAddon(fit);
      const container = document.createElement('div'); container.className = 'terminal-session'; this.host.querySelector('.terminal-body').append(container); term.open(container);
      session = { id: info.id, term, fit, container }; this.sessions.set(project.id, session);
      term.onData(data => this.api.terminal({ action: 'write', session: session.id, data }).catch(error => this.message(error.message)));
      term.onResize(({ cols, rows }) => this.api.terminal({ action: 'resize', session: session.id, cols, rows }).catch(() => {}));
      const attached = await this.api.terminal({ action: 'attach', session: info.id });
      term.write(Uint8Array.from(atob(attached.data), c => c.charCodeAt(0)));
    }
    for (const [id, entry] of this.sessions) entry.container.hidden = id !== project.id;
    requestAnimationFrame(() => { this.fit(); session.term.focus(); });
  }
  fit() { const session = this.sessions.get(this.active); if (session && !this.host.hidden && this.host.isConnected) { try { session.fit.fit(); } catch {} } }
  async stop() {
    const session = this.sessions.get(this.active); if (!session) return;
    await this.api.terminal({ action: 'stop', session: session.id }); session.term.dispose(); session.container.remove(); this.sessions.delete(this.active); this.host.hidden = true;
  }
}
