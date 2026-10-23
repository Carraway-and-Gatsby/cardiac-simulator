"""Build procedural assets and the pinned HRA derivative in the guarded background Blender only."""
from pathlib import Path
import runpy

SCRIPTS = Path(__file__).resolve().parent
runpy.run_path(str(SCRIPTS / 'build_demo.py'), run_name='__main__')
runpy.run_path(str(SCRIPTS / 'build_procedural.py'), run_name='__main__')

runpy.run_path(str(SCRIPTS / 'build_hra.py'), run_name='__main__')
