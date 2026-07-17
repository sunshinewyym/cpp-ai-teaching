#!/usr/bin/env python3
"""Replace all LaTeX formulas in cspS.js with Unicode characters."""
import re

with open('web/src/data/cspS.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Unicode subscripts and superscripts
subscript_map = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
                 'i':'ᵢ','j':'ⱼ','n':'ₙ','k':'ₖ','a':'ₐ','x':'ₓ'}
superscript_map = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
                   'n':'ⁿ'}

def convert_subscript(s):
    return ''.join(subscript_map.get(c, c) for c in s)

def convert_superscript(s):
    return ''.join(superscript_map.get(c, c) for c in s)

def replace_latex(match):
    latex = match.group(1).strip()

    # Simple numbers with dollar signs: $0$, $1$, $2$, etc.
    if re.match(r'^[\d.]+$', latex):
        return latex

    # Simple variables: $x$, $n$, $i$, etc.
    if re.match(r'^[a-zA-Z]$', latex):
        return latex

    # Subscript patterns: $a_{i}$, $a_{1,1}$, $w_i$, etc.
    m = re.match(r'^([a-zA-Z])_\{(.+?)\}$', latex)
    if m:
        return m.group(1) + convert_subscript(m.group(2))

    # Superscript patterns: $2^n$, $n^2$, $10^5$, etc.
    m = re.match(r'^([\d.]+)\^{([\d.]+)}$', latex)
    if m:
        return m.group(1) + convert_superscript(m.group(2))

    # $O(n^2)$ -> O(n²)
    m = re.match(r'^O\(n\^2\)$', latex)
    if m:
        return 'O(n²)'

    # $O(n)$ -> O(n)
    m = re.match(r'^O\(n\)$', latex)
    if m:
        return 'O(n)'

    # $O(n log n)$ -> O(n log n)
    m = re.match(r'^O\(n\\log n\)$', latex)
    if m:
        return 'O(n log n)'

    # $O(n \log n)$ -> O(n log n)
    m = re.match(r'^O\(n \\log n\)$', latex)
    if m:
        return 'O(n log n)'

    # $O(\log n)$ -> O(log n)
    m = re.match(r'^O\(\\log n\)$', latex)
    if m:
        return 'O(log n)'

    # $O(n+e)$ -> O(n+e)
    m = re.match(r'^O\(n\+e\)$', latex)
    if m:
        return 'O(n+e)'

    # $O(n^2 + e)$ -> O(n² + e)
    m = re.match(r'^O\(n\^2 \+ e\)$', latex)
    if m:
        return 'O(n² + e)'

    # Fraction patterns: $\dfrac{a}{b}$ -> a/b
    m = re.match(r'^\\dfrac\{(.+?)\}\{(.+?)\}$', latex)
    if m:
        return f'{m.group(1)}/{m.group(2)}'

    # $\lfloor \dfrac{x}{2} \rfloor$ -> ⌊x/2⌋
    m = re.match(r'^\\lfloor \\dfrac\{(.+?)\}\{(.+?)\} \\rfloor$', latex)
    if m:
        return f'⌊{m.group(1)}/{m.group(2)}⌋'

    # Comparison patterns: $a \leq b$ -> a ≤ b
    m = re.match(r'^(.+?) \\leq (.+?)$', latex)
    if m:
        return f'{m.group(1)} ≤ {m.group(2)}'

    # $a \times b$ -> a × b
    m = re.match(r'^(.+?) \\times (.+?)$', latex)
    if m:
        return f'{m.group(1)} × {m.group(2)}'

    # $\oplus$ -> ⊕
    if latex == '\\oplus':
        return '⊕'

    # $\dots$ -> …
    if latex == '\\dots':
        return '…'

    # $\cdots$ -> …
    if latex == '\\cdots':
        return '…'

    # $\sim$ -> ~
    if latex == '\\sim':
        return '~'

    # $\texttt{...}$ -> keep as is with backticks
    m = re.match(r'^\\texttt\{(.+?)\}$', latex)
    if m:
        return f'`{m.group(1)}`'

    # Range patterns: $0 \sim 10$ -> 0~10
    m = re.match(r'^(.+?) \\sim (.+?)$', latex)
    if m:
        return f'{m.group(1)}~{m.group(2)}'

    # Complex subscript: $a_{n,1},a_{n,2},\\dots,a_{n,n}$ -> aₙ,₁, aₙ,₂, …, aₙ,ₙ
    m = re.match(r'^([a-zA-Z])_\{([^}]+)\}(.*)$', latex)
    if m:
        base = m.group(1)
        sub = m.group(2)
        rest = m.group(3)
        return base + convert_subscript(sub) + rest

    # If nothing matched, return original with backticks
    return latex

# Replace all LaTeX formulas (both inline and display)
content = re.sub(r'\$([^$]+)\$', replace_latex, content)

# Also fix escaped LaTeX in strings: \\leq -> ≤, \\times -> ×, etc.
content = content.replace('\\\\leq', '≤')
content = content.replace('\\\\times', '×')
content = content.replace('\\\\oplus', '⊕')
content = content.replace('\\\\dots', '…')
content = content.replace('\\\\cdots', '…')
content = content.replace('\\\\sim', '~')
content = content.replace('\\\\dfrac{', '{')  # fallback
content = content.replace('\\\\lfloor', '⌊')
content = content.replace('\\\\rfloor', '⌋')
content = content.replace('\\\\texttt{', '`')
content = content.replace('\\\\log', 'log')

with open('web/src/data/cspS.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done! Replaced all LaTeX formulas with Unicode.')
