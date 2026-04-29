import subprocess, json, os

result = subprocess.run(
    ['node', 'scripts/quality/eslint-contract.mjs', '--project=web'],
    cwd='.',
    capture_output=True,
    text=True,
    encoding='utf-8',
    errors='ignore'
)
print('Return code:', result.returncode)
print('STDERR length:', len(result.stderr))
print('STDOUT length:', len(result.stdout))
if result.stderr:
    for line in result.stderr.split('\n')[:30]:
        if line.strip():
            print('STDERR:', line[:200])
if result.stdout:
    for line in result.stdout.split('\n')[:30]:
        if line.strip():
            print('STDOUT:', line[:200])
