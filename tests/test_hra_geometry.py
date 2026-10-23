"""Regression checks for source-preservation guarantees, without importing bpy.

These synthetic triangles test the narrow duplicate-index exception required by
Blender's importer. They do not validate the anatomical accuracy of any asset.
The production comparison function is compiled directly from its AST so its
behavior is tested without starting Blender or importing its runtime modules.
"""
import ast
from collections import Counter, defaultdict
import itertools
import json
import math
from pathlib import Path
import tempfile
import unittest


BUILDER = Path(__file__).resolve().parents[1] / 'blender/scripts/build_hra.py'


class HraGeometryPreservationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tree = ast.parse(BUILDER.read_text(), filename=str(BUILDER))
        function = next(node for node in tree.body
                        if isinstance(node, ast.FunctionDef) and node.name == 'compare_geometry')
        cls.comparison_code = compile(ast.Module(body=[function], type_ignores=[]), str(BUILDER), 'exec')

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='cardiolab-geometry-test-')
        self.addCleanup(self.temporary.cleanup)
        namespace = {
            'Counter': Counter, 'defaultdict': defaultdict, 'itertools': itertools,
            'json': json, 'math': math, 'ROOT': Path(self.temporary.name),
            'GEOMETRY_TOLERANCE_M': 1e-7,
        }
        exec(self.comparison_code, namespace)
        self.compare = namespace['compare_geometry']
        self.vertices = [(0.0, 0.0, 0.0), (1.0, 0.0, 0.0),
                         (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)]
        self.reference = {'vertices': self.vertices, 'triangles': [(0, 1, 2), (0, 2, 3)]}

    def test_vertex_reordering_and_cyclic_triangle_order_preserve_geometry(self):
        actual = {
            'vertices': [self.vertices[index] for index in (3, 1, 0, 2)],
            'triangles': [(1, 3, 2), (3, 0, 2)],
        }
        result = self.compare(self.reference, actual)
        self.assertTrue(result['orientedTrianglesPreserved'])
        self.assertEqual(result['maxCoordinateDeviationM'], 0)
        self.assertEqual(result['duplicateIndexFacesRemoved'], 0)

    def test_duplicate_index_group_may_keep_either_original_winding(self):
        reference = {'vertices': self.vertices,
                     'triangles': [(0, 1, 2), (2, 1, 0), (0, 2, 3)]}
        for retained_index, face in enumerate(reference['triangles'][:2]):
            with self.subTest(retained_source_face=retained_index):
                actual = {'vertices': self.vertices, 'triangles': [face, (0, 2, 3)]}
                result = self.compare(reference, actual)
                self.assertFalse(result['orientedTrianglesPreserved'])
                self.assertTrue(result['nonduplicateOrientedTrianglesPreserved'])
                self.assertEqual(result['sourceTriangles'], 3)
                self.assertEqual(result['triangles'], 2)
                self.assertEqual(result['sourceDuplicateIndexFaces'], 1)
                self.assertEqual(result['duplicateIndexFacesRemoved'], 1)
                self.assertEqual(result['maxCoordinateDeviationM'], 0)
                self.assertEqual(result['duplicateIndexRemoval'][0]['retainedWindingSourceTriangleIndex'],
                                 retained_index)

    def test_unique_surface_triangle_cannot_be_deleted(self):
        actual = {'vertices': self.vertices, 'triangles': [(0, 1, 2)]}
        with self.assertRaisesRegex(AssertionError, 'Oriented triangle connectivity changed'):
            self.compare(self.reference, actual)

    def test_nonduplicate_triangle_winding_cannot_be_reversed(self):
        actual = {'vertices': self.vertices, 'triangles': [(2, 1, 0), (0, 2, 3)]}
        with self.assertRaisesRegex(AssertionError, 'Oriented triangle connectivity changed'):
            self.compare(self.reference, actual)

    def test_coincident_geometry_with_distinct_indices_cannot_be_deleted(self):
        vertices = self.vertices[:3] * 2
        reference = {'vertices': vertices, 'triangles': [(0, 1, 2), (3, 4, 5)]}
        actual = {'vertices': vertices, 'triangles': [(0, 1, 2)]}
        with self.assertRaisesRegex(AssertionError, 'Oriented triangle connectivity changed'):
            self.compare(reference, actual)

    def test_duplicate_index_exception_does_not_hide_unique_triangle_deletion(self):
        reference = {'vertices': self.vertices,
                     'triangles': [(0, 1, 2), (2, 1, 0), (0, 2, 3)]}
        actual = {'vertices': self.vertices, 'triangles': [(0, 1, 2)]}
        with self.assertRaisesRegex(AssertionError, 'Oriented triangle connectivity changed'):
            self.compare(reference, actual)

    def test_new_triangle_cannot_be_added(self):
        actual = {'vertices': self.vertices,
                  'triangles': self.reference['triangles'] + [(0, 1, 3)]}
        with self.assertRaisesRegex(AssertionError, 'Oriented triangle connectivity changed'):
            self.compare(self.reference, actual)

    def test_coordinate_change_outside_declared_tolerance_is_rejected(self):
        actual = {'vertices': [(1e-4, 0.0, 0.0)] + self.vertices[1:],
                  'triangles': self.reference['triangles']}
        with self.assertRaisesRegex(AssertionError, 'Source vertex changed beyond'):
            self.compare(self.reference, actual)

    def test_coordinate_roundoff_inside_tolerance_is_measured(self):
        actual = {'vertices': [(5e-8, 0.0, 0.0)] + self.vertices[1:],
                  'triangles': self.reference['triangles']}
        result = self.compare(self.reference, actual)
        self.assertTrue(result['orientedTrianglesPreserved'])
        self.assertEqual(result['duplicateIndexFacesRemoved'], 0)
        self.assertAlmostEqual(result['maxCoordinateDeviationM'], 5e-8, places=15)
        self.assertEqual(result['toleranceM'], 1e-7)


if __name__ == '__main__':
    unittest.main()
