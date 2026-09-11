import asyncio
import base64
import json
import os
from pathlib import Path
import signal
import sys
import tempfile
import unittest

BROKER = Path(__file__).resolve().parents[1] / 'backend/terminal_service.py'


class TerminalTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='tricorder-pty-')
        self.root = Path(self.temp.name)
        self.project = self.root / 'project ; $(echo nope)'
        self.project.mkdir()
        self.socket = self.root / 'runtime/pty.sock'
        self.process = await asyncio.create_subprocess_exec(sys.executable, str(BROKER), str(self.socket),
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE, start_new_session=True,
            env={**os.environ, 'HOME': str(self.root), 'HISTFILE': str(self.root / 'shell-history')})
        for _ in range(100):
            if self.socket.exists():
                break
            await asyncio.sleep(.02)
        self.reader, self.writer = await asyncio.open_unix_connection(str(self.socket))
        self.counter = 0
        self.ids = []

    async def asyncTearDown(self):
        for identifier in self.ids:
            try:
                await self.call('stop', session=identifier)
            except Exception:
                pass
        self.writer.close()
        await self.writer.wait_closed()
        self.process.terminate()
        await self.process.wait()
        self.temp.cleanup()

    async def call(self, action, **payload):
        self.counter += 1
        self.writer.write((json.dumps({'id': self.counter, 'action': action, **payload}) + '\n').encode())
        await self.writer.drain()
        while True:
            message = json.loads(await asyncio.wait_for(self.reader.readline(), 5))
            if message.get('id') == self.counter:
                if message.get('error'):
                    raise ValueError(message['error'])
                return message['result']

    async def create(self):
        result = await self.call('create', project=str(self.project), environment='test', task='T01')
        self.ids.append(result['id'])
        return result['id']

    async def output(self, identifier, expected):
        for _ in range(80):
            attached = await self.call('attach', session=identifier)
            text = base64.b64decode(attached['data']).decode(errors='replace')
            if expected in text:
                return text
            await asyncio.sleep(.03)
        self.fail('Expected output not received: ' + expected)

    async def test_real_shell_resize_unicode_and_context(self):
        identifier = await self.create()
        await self.call('resize', session=identifier, cols=93, rows=27)
        await self.call('write', session=identifier, data="printf 'bonjour %s\\n' 'équipage'; pwd; stty size; printf '%s' \"$TRICORDER_TASK\"\n")
        text = await self.output(identifier, '27 93')
        self.assertIn('bonjour équipage', text)
        self.assertIn(str(self.project), text)
        self.assertIn('T01', text)

    async def test_reconnect_preserves_pid_and_output(self):
        identifier = await self.create()
        before = (await self.call('list'))[0]
        await self.call('write', session=identifier, data="printf 'persist-%s\\n' 'ok'\n")
        await self.output(identifier, 'persist-ok')
        self.writer.close()
        await self.writer.wait_closed()
        self.reader, self.writer = await asyncio.open_unix_connection(str(self.socket))
        after = (await self.call('list'))[0]
        self.assertEqual(before['pid'], after['pid'])
        self.assertTrue(after['alive'])
        self.assertIn('persist-ok', await self.output(identifier, 'persist-ok'))
        self.assertEqual(os.stat(self.socket).st_mode & 0o777, 0o600)
        self.assertFalse((self.root / 'runtime/transcript').exists())

    async def test_closed_session_is_not_active_and_stop_is_explicit(self):
        identifier = await self.create()
        await self.call('write', session=identifier, data='exit 7\n')
        for _ in range(80):
            result = (await self.call('list'))[0]
            if not result['alive'] and result['exitCode'] is not None:
                break
            await asyncio.sleep(.03)
        self.assertFalse(result['alive'])
        self.assertEqual(result['exitCode'], 7)
        await self.call('stop', session=identifier)
        self.ids.remove(identifier)
        self.assertEqual(await self.call('list'), [])

    async def test_invalid_resize_rejected(self):
        identifier = await self.create()
        with self.assertRaises(ValueError):
            await self.call('resize', session=identifier, cols=0, rows=1)


if __name__ == '__main__':
    unittest.main()
