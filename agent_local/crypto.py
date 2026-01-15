import os
import sys
import types
import importlib

_base = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
_local_agent_dir = os.path.join(_base, 'agent')

# Inject a local 'agent' namespace package pointing to this repo's agent/ dir
# Check if already exists (may have been created by another agent_local shim)
if 'agent' not in sys.modules:
    pkg = types.ModuleType('agent')
    pkg.__path__ = [_local_agent_dir]  # type: ignore[attr-defined]
    sys.modules['agent'] = pkg
else:
    pkg = sys.modules['agent']
    # Ensure __path__ is set for submodule imports
    if not hasattr(pkg, '__path__'):
        pkg.__path__ = [_local_agent_dir]

_mod = importlib.import_module('agent.crypto')

# Ensure agent.crypto is accessible as an attribute (needed for patching)
sys.modules['agent'].crypto = _mod  # type: ignore[attr-defined]

globals().update(_mod.__dict__)
