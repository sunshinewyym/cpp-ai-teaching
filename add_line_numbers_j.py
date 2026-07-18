#!/usr/bin/env python3
"""Add line numbers to code blocks in CSP-J 2019-2024 reading and completion questions."""
import re

with open('web/src/data/cspProgramProblems.js', 'r', encoding='utf-8') as f:
    content = f.read()

def add_line_numbers_to_escaped(code):
    """Add line numbers to escaped code (with \\n newlines)."""
    lines = code.split('\\n')
    numbered = []
    for i, line in enumerate(lines, 1):
        numbered.append(f'{i:02d} {line}')
    return '\\n'.join(numbered)

def process_field(field_content):
    """Process a field and add line numbers to code blocks."""
    def replace_code_block(match):
        full_match = match.group(0)
        backticks = match.group(1)
        code = match.group(2)

        # Check if code already has line numbers
        first_line = code.split('\\n')[0].strip()
        if re.match(r'^\d{1,2}\s', first_line):
            return full_match

        # Add language identifier if missing
        if backticks == '```':
            backticks = '```cpp'

        numbered_code = add_line_numbers_to_escaped(code)
        return f'{backticks}\\n{numbered_code}\\n```'

    # Pattern for escaped code blocks
    result = re.sub(r'(```(?:cpp)?)\\n((?:[^`]|`(?!``))*)\\n```', replace_code_block, field_content, flags=re.DOTALL)
    return result

# Find and process 2019-2024 reading and completion questions
years = ['2019', '2020', '2021', '2022', '2023', '2024']
types = ['reading', 'completion']

changes = 0
for year in years:
    for qtype in types:
        for num in range(1, 4 if qtype == 'reading' else 3):
            qid = f'{year}-{qtype}-{num}'

            pattern = f'"id": "{qid}"'
            idx = content.find(pattern)
            if idx == -1:
                continue

            # Find description field
            desc_pattern = '"description": "'
            desc_idx = content.find(desc_pattern, idx)
            if desc_idx == -1:
                continue

            stmt_pattern = '"statement": "'
            stmt_idx = content.find(stmt_pattern, desc_idx)
            if stmt_idx == -1:
                continue

            desc_start = desc_idx + len(desc_pattern)
            desc_end = content.rfind('"', desc_start, stmt_idx)
            if desc_end == -1:
                continue

            old_desc = content[desc_start:desc_end]
            new_desc = process_field(old_desc)

            if old_desc != new_desc:
                content = content[:desc_start] + new_desc + content[desc_end:]
                changes += 1
                print(f'Updated description for {qid}')

            # Find statement field
            stmt_idx2 = content.find(stmt_pattern, desc_idx)
            if stmt_idx2 == -1:
                continue

            stmt_start = stmt_idx2 + len(stmt_pattern)

            questions_pattern = '"questions": ['
            questions_idx = content.find(questions_pattern, stmt_start)
            if questions_idx == -1:
                continue

            stmt_end = content.rfind('"', stmt_start, questions_idx)
            if stmt_end == -1:
                continue

            old_stmt = content[stmt_start:stmt_end]
            new_stmt = process_field(old_stmt)

            if old_stmt != new_stmt:
                content = content[:stmt_start] + new_stmt + content[stmt_end:]
                changes += 1
                print(f'Updated statement for {qid}')

with open('web/src/data/cspProgramProblems.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nTotal changes: {changes}')
