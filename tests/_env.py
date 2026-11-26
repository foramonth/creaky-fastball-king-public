# Where the built HTML files live and which Chrome to use. Every test imports this, so no test hard-codes a path.
#   CFK_ROOT    folder with pitcher.html / pitcher_release.html (default: the repo root, one level up)
#   CFK_CHROME  Chrome/Chromium binary (default: /usr/bin/google-chrome if present, else Playwright's own browser)
import os, pathlib
ROOT = pathlib.Path(os.environ.get('CFK_ROOT') or pathlib.Path(__file__).resolve().parent.parent)
ROOT_URL = ROOT.as_uri() + '/'
CHROME = os.environ.get('CFK_CHROME') or ('/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None)

# v54.21: the page's Content Security Policy forbids eval, and Playwright's wait_for_function() evaluates its predicate
# with eval inside the page. Tests check the game, not the policy, so their pages bypass it by default; cspcheck.py
# asks for bypass_csp=False explicitly to test the policy itself.
try:
    from playwright.async_api import Browser as _Browser
    for _name in ('new_page', 'new_context'):
        _orig = getattr(_Browser, _name)
        def _wrap(orig):
            async def f(self, *a, **kw):
                kw.setdefault('bypass_csp', True); return await orig(self, *a, **kw)
            return f
        setattr(_Browser, _name, _wrap(_orig))
except ImportError:
    pass
