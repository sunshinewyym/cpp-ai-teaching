#!/usr/bin/env python3
"""Apply generated explanations to cspS.js"""
import json

with open('generated_exps.json', 'r', encoding='utf-8') as f:
    exps = json.load(f)

with open('web/src/data/cspS.js', 'r', encoding='utf-8') as f:
    content = f.read()

applied = 0
skipped = 0
not_found = 0

for qid, explanation in exps.items():
    # Escape for JS string
    escaped = explanation.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')

    # Find the question by id
    id_pattern = f'"id": "{qid}"'
    idx = content.find(id_pattern)
    if idx == -1:
        not_found += 1
        continue

    # Find the explanation field after this id
    exp_pattern = '"explanation":'
    exp_idx = content.find(exp_pattern, idx)
    if exp_idx == -1 or exp_idx - idx > 600:
        not_found += 1
        continue

    # Find the start and end of the explanation string
    str_start = content.find('"', exp_idx + len(exp_pattern)) + 1
    str_end = content.find('"', str_start)

    if str_start <= 0 or str_end == -1:
        not_found += 1
        continue

    old_exp = content[str_start:str_end]

    # Skip if already detailed
    if len(old_exp) > 80 and '请回到题目条件' not in old_exp:
        skipped += 1
        continue

    content = content[:str_start] + escaped + content[str_end:]
    applied += 1

with open('web/src/data/cspS.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Applied: {applied}, Skipped: {skipped}, Not found: {not_found}')
