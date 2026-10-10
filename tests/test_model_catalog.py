import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine.model_catalog import provider_models


class ModelCatalogueTests(unittest.TestCase):
    def test_only_public_model_metadata_and_local_policy_names_are_returned(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cache = root / ".codex/models_cache.json"
            cache.parent.mkdir()
            cache.write_text(json.dumps({"identity": {"sensitive": "do not export"}, "models": [
                {"slug": "model-a", "display_name": "Model A", "visibility": "list", "instructions": "do not export"},
                {"slug": "internal", "display_name": "Internal", "visibility": "hide"}]}))
            policy = root / ".odoo19-agents/workflows/model-policy.json"
            policy.parent.mkdir(parents=True)
            policy.write_text(json.dumps({"principal": {"codex": "model-a", "claude": "opus"},
                "roles": {"work": {"candidate": {"codex": {"model": "model-b"}, "claude": {"model": "sonnet"}}}}}))
            # A malformed credential file must never be read by this feature.
            (cache.parent / "auth.json").write_text("unreadable credential data")
            result = provider_models(root)
            self.assertEqual([item["id"] for item in result["codex"]], ["model-a", "model-b"])
            self.assertEqual([item["id"] for item in result["claude"]], ["opus", "sonnet"])
            self.assertEqual(result["codex"][0]["label"], "Model A")
            self.assertNotIn("do not export", json.dumps(result))

    def test_missing_malformed_or_oversized_metadata_uses_only_bundled_public_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            reference = provider_models(root)
            self.assertTrue(reference["codex"])
            self.assertTrue(all(item["source"] == "bundled-catalogue" for items in reference.values() for item in items))
            cache = root / ".codex/models_cache.json"
            cache.parent.mkdir()
            for content in ['not json', '[1,2]', '{"models": {}}', ' ' * 4_000_001]:
                cache.write_text(content)
                self.assertEqual(provider_models(root), reference)


if __name__ == "__main__":
    unittest.main()
