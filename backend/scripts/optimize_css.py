"""Strip unused CSS rules from style.css based on actual usage in HTML/JS."""
import re

# Load used classes and IDs
with open('/tmp/used_classes.txt') as f:
    used_classes = set(line.strip() for line in f if line.strip())
with open('/tmp/used_ids.txt') as f:
    used_ids = set(line.strip() for line in f if line.strip())

# Also add common utility classes not easily found by static scan
extra_classes = {
    'flex', 'flex-col', 'flex-wrap', 'items-center', 'items-start', 'items-end',
    'justify-center', 'justify-between', 'justify-end', 'justify-start',
    'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-8',
    'mt-1', 'mt-2', 'mt-3', 'mt-4', 'mt-5', 'mb-1', 'mb-2', 'mb-3', 'mb-4',
    'ml-1', 'ml-2', 'ml-3', 'mr-1', 'mr-2', 'mr-3',
    'px-2', 'px-3', 'px-4', 'py-1', 'py-2', 'py-3', 'p-2', 'p-3', 'p-4',
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl',
    'text-center', 'text-left', 'text-right',
    'text-main', 'text-muted', 'text-dim', 'text-primary', 'text-up', 'text-down',
    'text-danger', 'text-warn',
    'font-bold', 'font-semibold', 'font-mono', 'uppercase', 'lowercase', 'capitalize',
    'strong', 'tabler', 'tabular-nums', 'mono',
    'hidden', 'block', 'inline', 'inline-block', 'inline-flex',
    'relative', 'absolute', 'fixed', 'sticky',
    'w-full', 'w-auto', 'h-full', 'h-auto',
    'overflow-hidden', 'overflow-auto', 'overflow-x-auto',
    'rounded', 'rounded-lg', 'rounded-xl', 'rounded-full',
    'shadow', 'shadow-lg', 'shadow-sm',
    'border', 'border-t', 'border-b', 'border-l', 'border-r',
    'cursor-pointer', 'pointer-events-none',
    'truncate', 'whitespace-nowrap', 'break-all',
    'opacity-50', 'opacity-75', 'opacity-0',
    'transition', 'transition-all', 'duration-200', 'duration-300',
    'ease-out', 'ease-in-out',
}
used_classes.update(extra_classes)

# Always keep these selectors
always_keep = {
    '@media', '@font-face', '@keyframes', '@import', '@supports',
    'body', 'html', ':root', '*',
    '[data-theme', '[theme]',  # dynamic theme
}

def selector_is_used(sel_text):
    """Check if a CSS selector (or group) has at least one used part."""
    sel = sel_text.strip()
    
    # Always keep certain things
    if any(sel.startswith(k) for k in always_keep):
        return True
    
    # Handle selector groups (comma-separated)
    parts = [s.strip() for s in sel.split(',')]
    for part in parts:
        if part_matches_used(part):
            return True
    return False

def part_matches_used(part):
    """Check if a single CSS selector part matches used classes/IDs."""
    # Extract class names
    classes = re.findall(r'\.([\w-]+)', part)
    ids = re.findall(r'#([\w-]+)', part)
    tags = re.findall(r'^([a-z][\w-]*)', part)
    
    # Always keep pseudo elements/classes of kept selectors
    # If it has a class we use, keep it
    for cls in classes:
        if cls in used_classes:
            return True
    for id_ in ids:
        if id_ in used_ids:
            return True
    # If it's a bare tag selector
    for tag in tags:
        if tag in used_tags:
            return True
    
    # Keep attribute selectors (likely dynamic)
    if re.search(r'\[[\w-]+', part):
        return True
    
    # Keep pseudo-classes that are universally useful
    if part in (':root', ':hover', ':focus', ':active', ':visited', ':disabled',
                ':not()', ':is()', ':has()', ':where()', ':nth-child()',
                '::before', '::after', '::placeholder', '::selection',
                '::-webkit-scrollbar', '::-webkit-scrollbar-thumb'):
        return True
    
    return False

used_tags = {
    'body', 'html', 'head', 'div', 'span', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5',
    'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'select',
    'textarea', 'img', 'nav', 'header', 'footer', 'section', 'article', 'main', 'aside',
    'svg', 'path', 'circle', 'rect', 'line', 'text', 'g', 'defs', 'use',
    'sup', 'sub', 'strong', 'em', 'small', 'label', 'code', 'pre', 'br', 'hr',
    'iframe', 'canvas', 'video', 'script', 'link', 'meta', 'style', 'title',
    'thead', 'tbody', 'tr', 'th', 'td', 'table', 'col', 'colgroup',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'i', 'b', 'u', 'mark', 'del', 'ins',
    'abbr', 'address', 'blockquote', 'cite', 'q', 'sup', 'sub', 'time',
    'figure', 'figcaption', 'picture', 'source', 'audio',
    'details', 'summary', 'dialog', 'menu',
    'template', 'slot', 'fieldset', 'legend', 'label', 'output',
    'progress', 'meter', 'optgroup', 'option',
    'noscript', 'slot', 'wbr', 'data',
}

with open('style.css') as f:
    css = f.read()

# Parse CSS into rule blocks (simplified parser)
# Handle @media, @keyframes, @font-face, @supports as special blocks
blocks = []
i = 0
while i < len(css):
    # Skip comments
    if css[i:i+2] == '/*':
        end = css.find('*/', i)
        if end == -1:
            break
        blocks.append(('comment', css[i:end+2]))
        i = end + 2
        continue
    
    # @-rules with nested blocks
    if css[i] == '@':
        # Find the opening { — might be on same or next line
        brace_start = css.find('{', i)
        if brace_start == -1:
            # @import etc without braces
            semi = css.find(';', i)
            if semi == -1:
                blocks.append(('atrule', css[i:]))
                break
            blocks.append(('atrule', css[i:semi+1]))
            i = semi + 1
            continue
        
        # Check if it's @media with nested rules
        at_rule_name = css[i:brace_start].strip()
        if any(at_rule_name.startswith(k) for k in ['@media', '@supports', '@container', '@layer', '@scope']):
            # Count braces to find the matching closing brace
            depth = 0
            j = brace_start
            while j < len(css):
                if css[j] == '{':
                    depth += 1
                elif css[j] == '}':
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            blocks.append(('atblock', css[i:j+1]))
            i = j + 1
        else:
            # @font-face, @keyframes etc - simple block
            depth = 0
            j = brace_start
            while j < len(css):
                if css[j] == '{':
                    depth += 1
                elif css[j] == '}':
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            blocks.append(('atblock', css[i:j+1]))
            i = j + 1
        continue
    
    # Regular rule: selector(s) { properties }
    if css[i] == '}':
        i += 1
        continue
    
    brace_start = css.find('{', i)
    if brace_start == -1:
        break
    brace_end = css.find('}', brace_start)
    if brace_end == -1:
        break
    
    selector_raw = css[i:brace_start].strip()
    body = css[brace_start:brace_end+1]
    
    blocks.append(('rule', selector_raw, body))
    i = brace_end + 1

# Filter blocks
kept = []
removed_count = 0
for block in blocks:
    if block[0] in ('comment',):
        continue  # Remove all comments
    elif block[0] == 'atrule':
        kept.append(block[1])  # Keep @import etc
    elif block[0] == 'atblock':
        # For @media etc, keep if any inner rule is used
        content = block[1]
        # Find inner rules and filter them
        kept_atrule = filter_at_block(content)
        if kept_atrule:
            kept.append(kept_atrule)
    elif block[0] == 'rule':
        selector_raw, body = block[1], block[2]
        if selector_is_used(selector_raw):
            kept.append(f'{selector_raw} {body}')
        else:
            removed_count += 1

# Also remove trailing semicolons before }
kept_css = '\n'.join(kept)
kept_css = re.sub(r';\s*}', '}', kept_css)

# Minify
kept_css = re.sub(r'/\*.*?\*/', '', kept_css, flags=re.DOTALL)
kept_css = re.sub(r'\n{2,}', '\n', kept_css)

print(f'Removed {removed_count} unused rule blocks')
print(f'Original: {len(css)} chars ({len(css)//1024}KB)')
print(f'Kept:     {len(kept_css)} chars ({len(kept_css)//1024}KB)')

with open('style.clean.css', 'w') as f:
    f.write(kept_css)
print('Written to style.clean.css')
