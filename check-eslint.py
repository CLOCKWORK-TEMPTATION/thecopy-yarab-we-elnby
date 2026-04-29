import subprocess, json
result = subprocess.run(
    ['node', '--max-old-space-size=16384', '../../node_modules/eslint/bin/eslint.js', 'src', '--format', 'json', '--no-warn-ignored'],
    cwd='apps/web',
    capture_output=True,
    text=True,
    encoding='utf-8',
    errors='ignore'
)
try:
    data = json.loads(result.stdout)
except Exception as e:
    print('Failed to parse JSON:', e)
    print(result.stdout[:2000])
    exit(1)

total_errors = 0
total_fatal = 0
files_with_errors = []
for item in data:
    total_errors += item.get('errorCount', 0)
    total_fatal += item.get('fatalErrorCount', 0)
    if item.get('messages'):
        for msg in item['messages']:
            if msg.get('severity') == 2:
                files_with_errors.append((item['filePath'], msg.get('ruleId'), msg.get('message')))

print(f'Total errors: {total_errors}, fatal: {total_fatal}')
for f, rule, msg in files_with_errors[:50]:
    print(f'ERROR: {f} -> {rule}: {msg}')
