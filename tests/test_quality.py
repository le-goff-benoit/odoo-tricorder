from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import quality


class QualityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.release = self.root / 'changelog/r1'
        self.release.mkdir(parents=True)

    def tearDown(self):
        self.temp.cleanup()

    def test_counts_are_per_report_not_sum_of_parent_and_children(self):
        path = self.release / 'junit.xml'
        path.write_text('''<testsuites tests="4"><testsuite tests="4"><properties><property name="odoo.task" value="T01"/></properties>
          <testcase name="pass"/><testcase name="failure"><failure>Private content</failure></testcase>
          <testcase name="error"><error/></testcase><testcase name="skip"><skipped/></testcase>
        </testsuite></testsuites>''')
        result = quality.junit(self.root, path, ['T01'])
        self.assertEqual([result[k] for k in ('total', 'passed', 'failed', 'errors', 'skipped')], [4, 1, 1, 1, 1])
        self.assertEqual(result['task'], 'T01')
        self.assertEqual(result['status'], 'failed')
        self.assertNotIn('Private', str(result))

    def test_no_report_is_unknown_not_zero(self):
        result = quality.reports(self.root, 'r1', ['T01'])
        self.assertEqual(result['reports'], [])

    def test_reruns_stay_separate_and_unknown_task_not_inferred(self):
        for name in ('junit-first.xml', 'junit-rerun.xml'):
            (self.release / name).write_text('<testsuite tests="25" failures="0" errors="0" skipped="2"/>')
        result = quality.reports(self.root, 'r1', ['T01'])
        self.assertEqual(len(result['reports']), 2)
        self.assertTrue(all(r['total'] == 25 and r['task'] is None for r in result['reports']))

    def test_entities_and_invalid_counters_are_refused(self):
        path = self.release / 'junit.xml'
        for xml in ('<!DOCTYPE a><testsuite tests="1"/>', '<testsuite tests="1" failures="5"/>'):
            path.write_text(xml)
            with self.assertRaises(ValueError):
                quality.junit(self.root, path, [])


if __name__ == '__main__':
    unittest.main()
