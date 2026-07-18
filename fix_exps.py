#!/usr/bin/env python3
"""Fix explanations in cspChoicePapers.js"""
import json

# Read the explanations
with open('generated_exps.json', 'r', encoding='utf-8') as f:
    exps = json.load(f)

# Read the cspChoicePapers.js file
with open('web/src/data/cspChoicePapers.js', 'r', encoding='utf-8') as f:
    content = f.read()

# For each explanation, find the question and add the explanation field
applied = 0
for qid, explanation in exps.items():
    # Find the question by id
    id_pattern = f'"id": "{qid}"'
    idx = content.find(id_pattern)
    if idx == -1:
        continue

    # Find the answer field after this id
    answer_pattern = '"answer":'
    answer_idx = content.find(answer_pattern, idx)
    if answer_idx == -1 or answer_idx - idx > 500:
        continue

    # Find the end of the answer line (including the comma)
    answer_end = content.find('\n', answer_idx)
    if answer_end == -1:
        continue

    # Check if there's already an explanation field
    next_line_start = content.find('\n', answer_end + 1)
    if next_line_start != -1:
        next_line = content[next_line_start:next_line_start+50].strip()
        if next_line.startswith('"explanation"'):
            continue

    # Escape the explanation for JSON
    escaped_explanation = explanation.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')

    # Insert the explanation field after the answer field
    # Check if the answer line ends with a comma
    answer_line = content[answer_idx:answer_end].rstrip()
    if answer_line.endswith(','):
        # Already has comma, just add explanation
        explanation_line = f'\n      "explanation": "{escaped_explanation}"'
    else:
        # Need to add comma first
        explanation_line = f',\n      "explanation": "{escaped_explanation}"'

    content = content[:answer_end] + explanation_line + content[answer_end:]
    applied += 1

with open('web/src/data/cspChoicePapers.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Applied {applied} explanations')
