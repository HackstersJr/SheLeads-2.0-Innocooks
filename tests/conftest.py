from __future__ import annotations

import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Keep Firestore mode explicit for integration/regression tests.
os.environ.setdefault("USE_FIRESTORE", "true")
os.environ.setdefault("FIREBASE_KEY_PATH", str(BASE_DIR / "FIREBASE_KEY_PATH"))
