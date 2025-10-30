import os
import sys
import types
import importlib

_base = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
_local_agent_dir = os.path.join(_base, 'agent')

# Inject a local 'agent' namespace package pointing to this repo's agent/ dir
pkg = types.ModuleType('agent')
pkg.__path__ = [_local_agent_dir]  # type: ignore[attr-defined]
sys.modules['agent'] = pkg

_mod = importlib.import_module('agent.merchant_agent')

globals().update(_mod.__dict__)
