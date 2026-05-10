#!/usr/bin/env python3
"""
Fix try/except ModuleNotFoundError import patterns in backend Python files.
Strategy: for each try/except block, extract the import from the branch WITHOUT
'backend.' prefix, dedent it to the same level as the try line, and replace the
entire block with the clean import.

Usage: python3 fix_imports_v3.py
"""

import re
import os
import subprocess

BACKEND_DIR = '/home/rich27/retailbijak/backend'


def get_indent(line):
    """Get the leading whitespace of a line."""
    return len(line) - len(line.lstrip())


def dedent_lines(lines, amount):
    """Dedent each non-empty line by given amount of spaces."""
    result = []
    for line in lines:
        if line.strip():
            # Only remove leading spaces, not tabs
            indent = get_indent(line)
            if indent >= amount:
                result.append(' ' * (indent - amount) + line.lstrip())
            else:
                result.append(line)
        else:
            result.append(line)
    return result


def is_import_continuation(line):
    """Check if a line is a continuation of an import statement."""
    stripped = line.strip()
    if not stripped:
        return True  # empty lines are continuations (we handle them separately)
    return (stripped.startswith('from ') or
            stripped.startswith('import ') or
            stripped.startswith(',') or
            stripped == ')' or
            stripped.startswith('    ') or  # handle multi-line parens
            stripped == '')


def process_file(filepath):
    """Process a single file: replace all try/except ModuleNotFoundError import blocks."""
    relpath = os.path.relpath(filepath, BACKEND_DIR)
    print(f"Processing: {relpath}")
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_lines = content.split('\n')
    result = []
    i = 0
    modified = False
    
    while i < len(original_lines):
        line = original_lines[i]
        stripped = line.strip()
        
        if stripped == 'try:':
            try_indent = get_indent(line)  # indent of the 'try:' line
            j = i + 1
            
            # Collect try body lines
            try_lines = []
            while j < len(original_lines):
                if original_lines[j].strip().startswith('except ModuleNotFoundError:'):
                    break
                try_lines.append(original_lines[j])
                j += 1
            
            if j < len(original_lines):
                j += 1  # skip except line
            else:
                result.append(line)
                i += 1
                continue
            
            # Collect except body lines
            except_lines = []
            while j < len(original_lines):
                s = original_lines[j].strip()
                if s == '':
                    except_lines.append(original_lines[j])
                    j += 1
                    continue
                
                # If this line is not indented (at column 0), we've left the except block
                if get_indent(original_lines[j]) == 0 and not s.startswith(('from ', 'import ', ',', ')', '')):
                    break
                # If the indent is the same as or less than the try indent, we've left
                line_indent = get_indent(original_lines[j])
                if line_indent <= try_indent and s not in ('', ')') and not s.startswith(('from ', 'import ', ',')):
                    break
                    
                except_lines.append(original_lines[j])
                j += 1
            
            # Clean trailing empty lines from except block
            while except_lines and except_lines[-1].strip() == '':
                except_lines.pop()
            
            # Extract the import text from both blocks, preferring the one without 'backend.'
            try_text = '\n'.join(try_lines)
            except_text = '\n'.join(except_lines)
            
            if 'backend.' not in try_text and try_text.strip():
                clean_lines = try_lines
            elif 'backend.' not in except_text and except_text.strip():
                clean_lines = except_lines
            elif try_text.strip():
                clean_lines = [l.replace('from backend.', 'from ') for l in try_lines]
            elif except_text.strip():
                clean_lines = [l.replace('from backend.', 'from ') for l in except_lines]
            else:
                # No valid imports found
                result.append(line)
                i += 1
                continue
            
            # Dedent: remove try_indent + 4 from each line (one level deeper than try)
            dedent_amount = try_indent + 4
            clean_lines = dedent_lines(clean_lines, dedent_amount)
            
            # Add the clean import lines
            for cl in clean_lines:
                result.append(cl)
            
            modified = True
            print(f"  ✓ Replaced block at line {i+1} (try indent={try_indent}, {len(clean_lines)} lines)")
            i = j
        else:
            result.append(line)
            i += 1
    
    new_content = '\n'.join(result)
    
    if modified:
        # Sanity check
        old_lines = len(original_lines)
        new_lines_count = len(new_content.split('\n'))
        if new_lines_count < old_lines * 0.5:
            print(f"  ⚠ WARNING: File too small ({old_lines} -> {new_lines_count} lines). Aborting!")
            return False
        
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"  ✓ Saved ({new_lines_count} lines, was {old_lines})")
        return True
    
    print(f"  - No changes")
    return True  # Not an error


def process_main_py():
    """Process main.py: add sys.path setup then replace try/except blocks."""
    filepath = os.path.join(BACKEND_DIR, 'main.py')
    print(f"Processing: main.py")
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    # Step 1: Add sys.path setup at the top (after docstring, before first import)
    import_start = -1
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith(('from ', 'import ')):
            import_start = idx
            break
    
    if import_start > 0:
        sys_path_block = [
            'import sys',
            'from pathlib import Path',
            'sys.path.insert(0, str(Path(__file__).parent.resolve()))',
            '',
        ]
        new_lines = lines[:import_start] + sys_path_block + lines[import_start:]
        content = '\n'.join(new_lines)
        print(f"  ✓ Added sys.path setup before line {import_start + 1}")
        lines = content.split('\n')
    
    # Step 2: Replace try/except blocks
    original_lines = lines
    result = []
    i = 0
    modified = False
    
    while i < len(original_lines):
        line = original_lines[i]
        stripped = line.strip()
        
        if stripped == 'try:':
            try_indent = get_indent(line)
            j = i + 1
            
            try_lines = []
            while j < len(original_lines):
                if original_lines[j].strip().startswith('except ModuleNotFoundError:'):
                    break
                try_lines.append(original_lines[j])
                j += 1
            
            if j < len(original_lines):
                j += 1  # skip except line
            else:
                result.append(line)
                i += 1
                continue
            
            except_lines = []
            while j < len(original_lines):
                s = original_lines[j].strip()
                if s == '':
                    except_lines.append(original_lines[j])
                    j += 1
                    continue
                
                line_indent = get_indent(original_lines[j])
                if line_indent <= try_indent and s not in ('', ')') and not s.startswith(('from ', 'import ', ',')):
                    break
                    
                except_lines.append(original_lines[j])
                j += 1
            
            while except_lines and except_lines[-1].strip() == '':
                except_lines.pop()
            
            try_text = '\n'.join(try_lines)
            except_text = '\n'.join(except_lines)
            
            if 'backend.' not in try_text and try_text.strip():
                clean_lines = try_lines
            elif 'backend.' not in except_text and except_text.strip():
                clean_lines = except_lines
            elif try_text.strip():
                clean_lines = [l.replace('from backend.', 'from ') for l in try_lines]
            elif except_text.strip():
                clean_lines = [l.replace('from backend.', 'from ') for l in except_lines]
            else:
                result.append(line)
                i += 1
                continue
            
            # Dedent: remove try_indent + 4 from each line
            dedent_amount = try_indent + 4
            clean_lines = dedent_lines(clean_lines, dedent_amount)
            
            for cl in clean_lines:
                result.append(cl)
            
            modified = True
            print(f"  ✓ Replaced block at line {i+1} (try indent={try_indent})")
            i = j
        else:
            result.append(line)
            i += 1
    
    new_content = '\n'.join(result)
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"  ✓ Saved main.py ({len(new_content.split(chr(10)))} lines)")


def main():
    result = subprocess.run(
        ['grep', '-rl', 'except ModuleNotFoundError', BACKEND_DIR, '--include=*.py'],
        capture_output=True, text=True
    )
    files = result.stdout.strip().split('\n')
    files = [f for f in files if f]
    
    # Filter out test files
    test_files = ['test_ui_contract.py', 'test_api_e2e.py', 'test_ui_data_contract.py']
    files = [f for f in files if os.path.basename(f) not in test_files]
    
    print(f"Found {len(files)} files to process\n")
    
    success = 0
    fail = 0
    
    for filepath in sorted(files):
        if filepath.endswith('main.py'):
            process_main_py()
            success += 1
        else:
            if process_file(filepath):
                success += 1
            else:
                fail += 1
    
    print(f"\nDone! {success} files modified, {fail} files failed")


if __name__ == '__main__':
    main()
