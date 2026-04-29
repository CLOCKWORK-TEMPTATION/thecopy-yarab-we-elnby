import subprocess

result = subprocess.run(
    ['node', 'scripts/quality/eslint-contract.mjs', '--project=backend'],
    cwd='.',
    capture_output=True,
    text=True,
    encoding='utf-8',
    errors='ignore'
)
print('Return code:', result.returncode)
if result.stdout:
    for line in result.stdout.split('\n'):
        if line.strip():
            print('STDOUT:', line[:200])
if result.stderr:
    for line in result.stderr.split('\n'):
        if line.strip():
            print('STDERR:', line[:200])
