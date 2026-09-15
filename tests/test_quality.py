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

    def test_mixed_summary_failure_cannot_become_a_green_report(self):
        path = self.release / 'junit.xml'
        path.write_text('''<testsuites tests="2" failures="1">
          <testsuite tests="1" failures="0"><testcase name="ok"/></testsuite>
          <testsuite tests="1" failures="1"/>
        </testsuites>''')
        with self.assertRaisesRegex(ValueError, 'Compteurs de tests incohérents'):
            quality.junit(self.root, path, [])
        result = quality.reports(self.root, 'r1', [])
        self.assertEqual(result['reports'], [])
        self.assertEqual(result['warnings'], ['Rapport non exploitable : junit.xml'])

    def test_detailed_reports_must_match_each_declared_counter(self):
        path = self.release / 'junit.xml'
        for xml in (
            '<testsuite tests="2" errors="1"><testcase name="ok"/></testsuite>',
            '<testsuite tests="1" skipped="1"><testcase name="ok"/></testsuite>',
            '<testsuite tests="1" failures="0"><testcase><failure/></testcase></testsuite>',
            '<testsuite tests="1" errors="0"><testcase><error/></testcase></testsuite>',
            '<testsuite tests="1" skipped="0"><testcase><skipped/></testcase></testsuite>',
            '<testsuite tests="invalid"><testcase/></testsuite>',
            '<testsuite tests="1" failures="-1"><testcase/></testsuite>',
            # The correct root must not hide an inconsistent child suite.
            '<testsuites tests="1"><testsuite tests="2"><testcase/></testsuite></testsuites>',
        ):
            with self.subTest(xml=xml):
                path.write_text(xml)
                with self.assertRaises(ValueError):
                    quality.junit(self.root, path, [])

    def test_contradictory_case_outcomes_are_refused(self):
        path = self.release / 'junit.xml'
        for outcomes in ('<failure/><skipped/>', '<error/><skipped/>', '<failure/><error/>'):
            with self.subTest(outcomes=outcomes):
                path.write_text('<testsuite><testcase>' + outcomes + '</testcase></testsuite>')
                with self.assertRaisesRegex(ValueError, 'Résultats de test contradictoires'):
                    quality.junit(self.root, path, [])

    def test_nested_summaries_are_checked_without_double_counting(self):
        path = self.release / 'junit.xml'
        path.write_text('''<testsuites tests="4" failures="1" errors="1" skipped="1">
          <testsuite tests="4" failures="1" errors="1" skipped="1">
            <testsuite tests="2" failures="1"/><testsuite tests="2" errors="1" skipped="1"/>
          </testsuite>
        </testsuites>''')
        result = quality.junit(self.root, path, [])
        self.assertEqual([result[k] for k in ('total', 'passed', 'failed', 'errors', 'skipped')], [4, 1, 1, 1, 1])
        self.assertEqual(result['status'], 'failed')

    def test_parent_summary_cannot_hide_child_failure_or_skip(self):
        path = self.release / 'junit.xml'
        for counter in ('failures', 'errors', 'skipped'):
            with self.subTest(counter=counter):
                path.write_text(f'<testsuites tests="1" {counter}="0"><testsuite tests="1" {counter}="1"/></testsuites>')
                with self.assertRaisesRegex(ValueError, 'Compteurs de tests incohérents'):
                    quality.junit(self.root, path, [])

    def test_coherent_green_and_skipped_reports_keep_their_status(self):
        path = self.release / 'junit.xml'
        for xml, status in (
            ('<testsuites tests="1" failures="0"><testsuite tests="1"><testcase/></testsuite></testsuites>', 'passed'),
            ('<testsuites tests="1" failures="0"><testsuite tests="1"/></testsuites>', 'passed'),
            ('<testsuite tests="1" skipped="1"><testcase><skipped/></testcase></testsuite>', 'unverified'),
            ('<testsuite tests="1" skipped="1"/>', 'unverified'),
        ):
            with self.subTest(xml=xml):
                path.write_text(xml)
                result = quality.junit(self.root, path, [])
                self.assertEqual(result['status'], status)
                self.assertEqual(result['total'], 1)


if __name__ == '__main__':
    unittest.main()
