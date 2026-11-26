# Copy this (private, working) repository into the public one, minus the working notes.
#   python3 publish_public.py <path to a clone of the public repo> ["commit message"]
# Only files tracked here are copied, and these are left out on purpose:
#   CLAUDE.md, docs/   — working notes: the user's own prompts, other AIs' reviews, account and project names
# The public repo gets no history from here: each run becomes one ordinary commit there.
import os, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
EXCLUDE_FILES = {'CLAUDE.md'}
EXCLUDE_DIRS = ('docs/',)

def tracked():
    out = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.splitlines()
    return [f for f in out if f not in EXCLUDE_FILES and not f.startswith(EXCLUDE_DIRS)]

def main():
    if len(sys.argv) < 2: sys.exit(__doc__ or 'usage: publish_public.py <public clone> [message]')
    dst = os.path.abspath(sys.argv[1]); msg = sys.argv[2] if len(sys.argv) > 2 else 'sync from the working repo'
    if not os.path.isdir(os.path.join(dst, '.git')): sys.exit(f'{dst} is not a git clone')
    if os.path.samefile(dst, ROOT): sys.exit('refusing to publish into the working repo itself')
    files = tracked()
    # clear the public tree (except .git) so files removed here disappear there too
    for name in os.listdir(dst):
        if name == '.git': continue
        p = os.path.join(dst, name); shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    for f in files:
        os.makedirs(os.path.dirname(os.path.join(dst, f)) or dst, exist_ok=True)
        shutil.copy2(os.path.join(ROOT, f), os.path.join(dst, f))
    leaks = [f for f in files if f in EXCLUDE_FILES or f.startswith(EXCLUDE_DIRS)]
    assert not leaks, leaks
    subprocess.run(['git', 'add', '-A'], cwd=dst, check=True)
    if subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=dst).returncode == 0:
        print('public repo already up to date'); return
    subprocess.run(['git', '-c', 'user.name=Claude', '-c', 'user.email=noreply@anthropic.com', 'commit', '-q', '-m', msg], cwd=dst, check=True)
    print(f'committed {len(files)} files to {dst} (push it from there)')

if __name__ == '__main__': main()
