"""Independent PTY probe. A shell foreground group does not prove a prompt."""
import sys, json, asyncio, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'tests'))
from test_terminal_service import TerminalTests
class PromptReview(TerminalTests):
 async def test_review_builtin_read(self):
  identifier=await self.create()
  await self.call('write',session=identifier,data="read -r answer; printf 'RECEIVED:%s\\n' \"$answer\"\n")
  await asyncio.sleep(.2)
  before=(await self.call('list'))[0]
  try:
   await self.call('write-if-idle',session=identifier,data='SYNTHETIC_RESUME_COMMAND\n')
   accepted=True
  except ValueError:accepted=False
  text=await self.output(identifier,'RECEIVED:SYNTHETIC_RESUME_COMMAND') if accepted else ''
  print(json.dumps({'idleShell_during_read':before['idleShell'],'write_accepted':accepted,'resume_consumed_as_read_answer':'RECEIVED:SYNTHETIC_RESUME_COMMAND' in text}))
if __name__=='__main__':
 unittest.TextTestRunner().run(unittest.TestSuite([PromptReview('test_review_builtin_read')]))
