"""User-private Unix-socket PTY broker. Shells survive closing the desktop window.

No TCP listener, no terminal transcripts on disk. Scrollback is bounded in memory.
This process intentionally has the user's shell privileges, like any terminal.
"""
import asyncio
import base64
import fcntl
import json
import os
from pathlib import Path
import pty
import signal
import socket
import struct
import sys
import termios
import time
import tempfile
import uuid

MAX_BUFFER = 2 * 1024 * 1024
MAX_PENDING_INPUT = 1024 * 1024


class Terminal:
    def __init__(self, broker, request):
        self.broker = broker
        self.id = uuid.uuid4().hex
        self.project = str(Path(request['project']).resolve(strict=True))
        if not Path(self.project).is_dir():
            raise ValueError('Dossier du projet absent')
        self.environment = request.get('environment') or None
        self.release = request.get('release') or None
        self.task = request.get('task') or None
        self.working_directory = str(Path(request.get('workingDirectory') or self.project).resolve(strict=True))
        if not Path(self.working_directory).is_dir():
            raise ValueError('Dossier de travail absent')
        self.created = time.time()
        self.last_output = None
        self.buffer = bytearray()
        self.exit_code = None
        self.closed = False
        # Input waiting for the PTY. Writes never block the broker: a program that
        # stops reading its input must not freeze the other terminals.
        self.pending = bytearray()
        self.writing = False
        shell = os.environ.get('SHELL', '/bin/bash')
        if not os.path.isfile(shell) or not os.access(shell, os.X_OK):
            shell = '/bin/bash'
        self.at_prompt = False
        self.prompt_generation = 0
        self.resuming = False
        self.control_buffer = b''
        self.prompt_prefix = ('\x1b]777;tricorder-' + uuid.uuid4().hex + ';').encode()
        self.shell_init = None
        if request.get('cleanShell') or Path(shell).name == 'bash':
            # Bash PS0 runs before every command, including read and compound
            # commands. PROMPT_COMMAND marks only the primary prompt, not PS2.
            with tempfile.NamedTemporaryFile(mode='w', prefix='tricorder-shell-', delete=False) as startup:
                self.shell_init = startup.name
                if not request.get('cleanShell'):
                    startup.write('[ ! -f ~/.bashrc ] || source ~/.bashrc\n')
                marker = self.prompt_prefix.decode().replace('\x1b', '\\033')
                startup.write("PS0=$'" + marker + "busy\\007'${PS0-}\n")
                startup.write("PROMPT_COMMAND+=(\"printf '" + marker + "prompt\\007'\")\n")
        self.pid, self.fd = pty.fork()
        if self.pid == 0:
            try:
                os.chdir(self.working_directory)
                env = {**os.environ, 'TERM': 'xterm-256color', 'COLORTERM': 'truecolor',
                       'TRICORDER_SESSION_ID': self.id, 'TRICORDER_PROJECT': self.project,
                       'TRICORDER_WORKING_DIRECTORY': self.working_directory,
                       'TRICORDER_ENVIRONMENT': self.environment or '',
                       'TRICORDER_RELEASE': self.release or '', 'TRICORDER_TASK': self.task or ''}
                # Selection is metadata, never production confirmation or credentials.
                for key in ('ODOO_PRODUCTION_CONFIRMED', 'ODOO_INSTANCE_SECRET', 'ODOO_INSTANCE_LOGIN'):
                    env.pop(key, None)
                if request.get('cleanShell'):
                    env['HISTFILE'] = '/dev/null'
                if self.shell_init:
                    os.execve('/bin/bash', ['/bin/bash', '--noprofile', '--rcfile', self.shell_init, '-i'], env)
                os.execve(shell, [shell, '-i'], env)
            except Exception:
                os._exit(127)
        os.set_blocking(self.fd, False)
        self.resize(request.get('cols', 100), request.get('rows', 30))
        asyncio.get_running_loop().add_reader(self.fd, self.read)

    def resize(self, cols, rows):
        if self.closed:
            return
        cols, rows = int(cols), int(rows)
        if not 2 <= cols <= 500 or not 1 <= rows <= 300:
            raise ValueError('Dimensions du terminal invalides')
        fcntl.ioctl(self.fd, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))

    def read(self):
        try:
            data = os.read(self.fd, 65536)
            if not data:
                self.finish()
                return
            self.last_output = time.time()
            data = self.prompt_output(data)
            self.buffer.extend(data)
            if len(self.buffer) > MAX_BUFFER:
                del self.buffer[:-MAX_BUFFER]
            self.broker.emit({'event': 'data', 'session': self.id,
                              'data': base64.b64encode(data).decode('ascii')})
        except BlockingIOError:
            pass
        except OSError:
            self.finish()

    def prompt_output(self, data):
        """Strip private shell markers, including markers split across PTY reads."""
        pending = self.control_buffer + data
        output = bytearray()
        while pending:
            start = pending.find(self.prompt_prefix)
            if start < 0:
                keep = next((n for n in range(min(len(pending), len(self.prompt_prefix)-1), 0, -1)
                             if pending.endswith(self.prompt_prefix[:n])), 0)
                output.extend(pending[:-keep] if keep else pending)
                pending = pending[-keep:] if keep else b''
                break
            output.extend(pending[:start])
            pending = pending[start:]
            end = pending.find(b'\x07', len(self.prompt_prefix))
            if end < 0:
                break
            marker = pending[len(self.prompt_prefix):end]
            self.at_prompt = marker == b'prompt'
            if self.at_prompt:
                self.prompt_generation += 1
            pending = pending[end+1:]
        self.control_buffer = pending
        return bytes(output)

    def finish(self):
        if self.closed:
            return
        self.closed = True
        self.at_prompt = False
        if self.shell_init:
            Path(self.shell_init).unlink(missing_ok=True)
        loop = asyncio.get_running_loop()
        loop.remove_reader(self.fd)
        if self.writing:
            loop.remove_writer(self.fd)
            self.writing = False
        self.pending.clear()
        os.close(self.fd)
        self.broker.emit({'event': 'sessions'})

    def stop(self):
        if self.closed:
            return
        # Explicit stop: terminate every process in this terminal's POSIX session,
        # including a foreground job in a different process group.
        for proc in Path('/proc').iterdir():
            if not proc.name.isdigit():
                continue
            try:
                if os.getsid(int(proc.name)) == self.pid:
                    os.kill(int(proc.name), signal.SIGHUP)
            except (OSError, ProcessLookupError):
                pass
        self.finish()

    async def resume_command(self, value):
        if self.resuming or not self.metadata().get('idleShell') or self.pending:
            raise ValueError('Prompt principal non vérifié ; terminez le programme ou la saisie multiligne dans le terminal avant de reprendre')
        self.resuming = True
        generation = self.prompt_generation
        try:
            # Cancel the entire Readline edit, including text right of the cursor.
            # Never infer successful cancellation from the keystroke itself.
            await self.write('\x03', internal=True)
            async def fresh_prompt():
                while not self.closed:
                    if self.prompt_generation > generation and self.metadata().get('idleShell') and not self.pending:
                        return
                    await asyncio.sleep(.01)
                raise ValueError('Le terminal s’est arrêté avant la reprise')
            try:
                await asyncio.wait_for(fresh_prompt(), 2)
            except asyncio.TimeoutError:
                raise ValueError('Nouveau prompt non confirmé après annulation de la saisie ; aucune commande de reprise envoyée') from None
            await self.write(value, internal=True)
        finally:
            self.resuming = False

    async def write(self, value, *, internal=False):
        if self.resuming and not internal:
            raise ValueError('Reprise en cours ; attendez le nouveau prompt avant de saisir')
        if self.closed:
            raise ValueError('Session terminée')
        data = value.encode('utf-8')
        if len(data) > MAX_PENDING_INPUT:
            raise ValueError('Collage trop volumineux')
        if len(self.pending) + len(data) > MAX_PENDING_INPUT:
            raise ValueError('Le programme de ce terminal ne lit plus sa saisie : texte refusé')
        if any(char in data for char in (b'\r', b'\n', b'\x03', b'\x04', b'\x0f')):
            self.at_prompt = False
        self.pending.extend(data)
        self.flush()

    def flush(self):
        while self.pending and not self.closed:
            try:
                written = os.write(self.fd, self.pending)
                del self.pending[:written]
            except BlockingIOError:
                if not self.writing:
                    asyncio.get_running_loop().add_writer(self.fd, self.flush)
                    self.writing = True
                return
            except OSError:
                self.pending.clear()
        if self.writing:
            asyncio.get_running_loop().remove_writer(self.fd)
            self.writing = False

    def metadata(self):
        foreground, program = None, None
        if not self.closed:
            try:
                foreground = os.tcgetpgrp(self.fd)
                program = Path(f'/proc/{foreground}/comm').read_text().strip()
            except OSError:
                pass
        provider = None
        if program and 'claude' in program.lower():
            provider = 'claude'
        elif program and 'codex' in program.lower():
            provider = 'codex'
        return {'id': self.id, 'project': self.project, 'environment': self.environment,
                'workingDirectory': self.working_directory,
                'release': self.release, 'task': self.task, 'createdAt': self.created,
                'lastOutputAt': self.last_output, 'pid': self.pid, 'program': program,
                'provider': provider, 'foreground': foreground, 'promptVerified': bool(self.shell_init), 'idleShell': self.at_prompt and foreground == self.pid and program == 'bash', 'alive': not self.closed, 'exitCode': self.exit_code,
                'activity': 'process' if not self.closed else 'exited'}


class Broker:
    def __init__(self):
        self.sessions = {}
        # Stopped shells leave the session list at once but must still be reaped.
        self.stopped = set()
        self.clients = set()
        self.subscriptions = {}
        self.last_client = time.time()

    def emit(self, message):
        wire = (json.dumps(message) + '\n').encode()
        for writer in tuple(self.clients):
            if message.get('event') == 'data' and message['session'] not in self.subscriptions.get(writer, set()):
                continue
            if writer.is_closing():
                continue
            if writer.transport.get_write_buffer_size() > MAX_BUFFER * 2:
                writer.close()
                continue
            writer.write(wire)

    async def dispatch(self, request, writer):
        action = request['action']
        if action == 'list':
            return [s.metadata() for s in self.sessions.values()]
        if action == 'create':
            if sum(not s.closed for s in self.sessions.values()) >= 40:
                raise ValueError('Limite de 40 terminaux actifs atteinte')
            terminal = Terminal(self, request)
            self.sessions[terminal.id] = terminal
            self.emit({'event': 'sessions'})
            return terminal.metadata()
        if action == 'ping':
            return {'protocol': 1, 'pid': os.getpid(), 'capabilities': ['working-directory', 'safe-launch', 'verified-prompt']}
        terminal = self.sessions.get(request.get('session'))
        if terminal is None:
            raise ValueError('Session inconnue')
        if action == 'attach':
            self.subscriptions[writer].add(terminal.id)
            return {'session': terminal.metadata(), 'data': base64.b64encode(terminal.buffer).decode('ascii')}
        if action == 'write-if-idle':
            await terminal.resume_command(request['data'])
        elif action == 'write':
            await terminal.write(request['data'])
        elif action == 'resize':
            terminal.resize(request['cols'], request['rows'])
        elif action == 'stop':
            terminal.stop()
            self.sessions.pop(terminal.id, None)
            if terminal.exit_code is None:
                self.stopped.add(terminal.pid)
            self.emit({'event': 'sessions'})
        else:
            raise ValueError('Action inconnue')
        return None

    async def client(self, reader, writer):
        # Socket permissions plus peer credential check, Linux/Ubuntu.
        peer = writer.get_extra_info('socket')
        _, uid, _ = struct.unpack('3i', peer.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, 12))
        if uid != os.getuid():
            writer.close()
            return
        self.clients.add(writer)
        self.subscriptions[writer] = set()
        try:
            while line := await reader.readline():
                request = {}
                try:
                    request = json.loads(line)
                    result = await self.dispatch(request, writer)
                    response = {'id': request.get('id'), 'result': result}
                except Exception as exc:
                    response = {'id': request.get('id'), 'error': str(exc)}
                writer.write((json.dumps(response) + '\n').encode())
                await writer.drain()
        except (OSError, ValueError):
            pass
        finally:
            self.clients.discard(writer)
            self.subscriptions.pop(writer, None)
            self.last_client = time.time()
            writer.close()

    async def reap(self):
        while True:
            await asyncio.sleep(1)
            for terminal in list(self.sessions.values()):
                if terminal.exit_code is not None:
                    continue
                try:
                    pid, status = os.waitpid(terminal.pid, os.WNOHANG)
                    if pid:
                        terminal.exit_code = os.waitstatus_to_exitcode(status)
                        # PTY read callback drains final output before closing.
                        self.emit({'event': 'sessions'})
                except ChildProcessError:
                    pass
            for pid in tuple(self.stopped):
                try:
                    if os.waitpid(pid, os.WNOHANG)[0]:
                        self.stopped.discard(pid)
                except ChildProcessError:
                    self.stopped.discard(pid)
            if not self.clients and not any(not s.closed for s in self.sessions.values()) and time.time() - self.last_client > 600:
                os._exit(0)


async def serve(path):
    path = Path(path)
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    if path.parent.stat().st_uid != os.getuid():
        raise ValueError('Répertoire de socket non possédé par cet utilisateur')
    os.chmod(path.parent, 0o700)
    # Serialize startup; never unlink the socket of another live broker.
    lock = (path.parent / 'broker.lock').open('a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        return
    if path.exists():
        path.unlink()
    broker = Broker()
    server = await asyncio.start_unix_server(broker.client, str(path), limit=2 * 1024 * 1024)
    os.chmod(path, 0o600)
    asyncio.create_task(broker.reap())
    async with server:
        await server.serve_forever()


if __name__ == '__main__':
    # Electron can pass Chromium/inspector descriptors through spawn. This
    # detached service owns only its stdio until serve creates its socket.
    # Keeping those descriptors open would keep the desktop's IPC alive after
    # its process exits, and leak them into every later terminal.
    for inherited in Path('/proc/self/fd').iterdir():
        if int(inherited.name) > 2:
            try:
                os.close(int(inherited.name))
            except OSError:
                pass
    asyncio.run(serve(sys.argv[1]))
