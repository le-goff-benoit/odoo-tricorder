"""A partial command may have text after the cursor; Ctrl-U is not clear-line."""
import sys,json,asyncio,unittest,base64
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'tests'))
from test_terminal_service import TerminalTests
class CursorReview(TerminalTests):
 async def test_resume_cursor_middle(self):
  identifier=await self.create()
  for _ in range(100):
   if (await self.call('list'))[0].get('idleShell'):break
   await asyncio.sleep(.02)
  await self.call('write',session=identifier,data="; printf 'UNEXPECTED-%s\\n' 'EXECUTION'\x01")
  await asyncio.sleep(.1)
  await self.call('write-if-idle',session=identifier,data="printf 'EXPECTED-%s\\n' 'RESUME'\n")
  await asyncio.sleep(.2)
  attached=await self.call('attach',session=identifier)
  text=base64.b64decode(attached['data']).decode(errors='replace')
  print(json.dumps({'expected_executed':'EXPECTED-RESUME' in text,'unsent_suffix_executed':'UNEXPECTED-EXECUTION' in text}))
if __name__=='__main__':unittest.TextTestRunner().run(unittest.TestSuite([CursorReview('test_resume_cursor_middle')]))
