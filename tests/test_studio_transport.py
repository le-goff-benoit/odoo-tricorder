"""The Electron bridge must never parse an incomplete request."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class StudioTransportTests(unittest.TestCase):
    def request(self, size):
        with tempfile.TemporaryDirectory() as state:
            raw = json.dumps({"action": "overview.get", "padding": ""}, separators=(",", ":"))
            raw = raw.replace('"padding":""', '"padding":"' + "x" * (size - len(raw)) + '"')
            self.assertEqual(len(raw.encode()), size)
            result = subprocess.run(
                [sys.executable, str(Path(__file__).resolve().parents[1] / "backend/studio.py"), "--state", state],
                input=raw.encode(), capture_output=True, check=True, timeout=10,
            )
            return json.loads(result.stdout)

    def test_complete_request_at_byte_limit_is_not_truncated(self):
        response = self.request(4 * 1024 * 1024)
        self.assertTrue(response["ok"], response)
        self.assertEqual(response["result"]["schedules"], [])

    def test_oversized_request_has_explicit_error_instead_of_partial_json(self):
        response = self.request(4 * 1024 * 1024 + 1)
        self.assertFalse(response["ok"])
        self.assertIn("Requête trop volumineuse", response["error"])


if __name__ == "__main__":
    unittest.main()
