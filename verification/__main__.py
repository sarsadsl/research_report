# -*- coding: utf-8 -*-
"""支援 `python -m verification` 執行獨立研究驗證 CLI。"""

from __future__ import annotations

import sys

from .cli import main

if __name__ == "__main__":
    sys.exit(main())
