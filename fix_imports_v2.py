#!/usr/bin/env python3
"""
Fix try/except ModuleNotFoundError import patterns in backend Python files.
Strategy: use regex to find each complete try/except block, extract the import
from the branch WITHOUT 'backend.' prefix, and replace the block with just that import.

Usage: python3 fix_imports_v2.py
"""

import re
import os
import sys

BACKEND_DIR = '/home/rich27/retailbijak/backend'

def process_file(filepath):
    """Process a single file: replace all try/except ModuleNotFoundError import blocks."""
    print(f"Processing: {os.path.relpath(filepath, BACKEND_DIR)}")
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    modified = False
    
    # Strategy: use re.sub with a function that examines the match and replaces it
    # Pattern: try:\n(  from ...)\nexcept ModuleNotFoundError:\n(  from ...)
    # For multi-line parenthesized imports, we need a more flexible approach.
    
    # Let's find try/except blocks by line-by-line processing
    lines = content.split('\n')
    result = []
    i = 0
    
    while i < len(lines):
        # Look for a try: line that's followed by import lines and then except ModuleNotFoundError:
        if lines[i].strip() == 'try:':
            # Check if this is followed by 'from' or '    from' lines
            j = i + 1
            # Collect lines that are indented import statements (may continue with parenthesized)
            try_import_lines = []
            while j < len(lines):
                stripped = lines[j].strip()
                if stripped.startswith('except ModuleNotFoundError:'):
                    break
                try_import_lines.append(lines[j])
                j += 1
            
            if j < len(lines) and lines[j].strip().startswith('except ModuleNotFoundError:'):
                j += 1  # skip the except line
                
                # Collect except import lines
                except_import_lines = []
                while j < len(lines):
                    stripped = lines[j].strip()
                    # End: empty line followed by non-indented, or non-empty non-continuation
                    if stripped == '':
                        # Empty line - keep it, but peek ahead
                        except_import_lines.append(lines[j])
                        j += 1
                        continue
                    
                    # Check if this is a continuation line (indented, starts with from or is inside parens)
                    is_continuation = (lines[j][0] in ' \t' and 
                                      (stripped.startswith('from ') or 
                                       stripped.startswith('import ') or
                                       stripped.startswith(',') or
                                       stripped.startswith(')') or
                                       stripped.startswith('        ') or  # continuation of parenthesized
                                       stripped == ''))
                    
                    if not is_continuation:
                        # This is a new top-level statement
                        break
                    
                    except_import_lines.append(lines[j])
                    j += 1
                
                # Clean trailing empty lines from except block
                while except_import_lines and except_import_lines[-1].strip() == '':
                    except_import_lines.pop()
                
                # Now we have both blocks. Pick the one without 'backend.' prefix
                try_text = '\n'.join(try_import_lines)
                except_text = '\n'.join(except_import_lines)
                
                if 'backend.' not in try_text and try_text.strip():
                    # Use try block (it already doesn't have backend.)
                    clean_import = try_text
                elif 'backend.' not in except_text and except_text.strip():
                    # Use except block
                    clean_import = except_text
                elif try_text.strip():
                    # Both have backend. - remove it from try block
                    clean_import = try_text.replace('from backend.', 'from ')
                elif except_text.strip():
                    clean_import = except_text.replace('from backend.', 'from ')
                else:
                    # No imports found, keep original
                    result.append(lines[i])
                    i += 1
                    continue
                
                # Make sure clean_import doesn't have any backend. references
                clean_import = clean_import.replace('from backend.', 'from ')
                
                # Add the clean import
                result.append(clean_import)
                modified = True
                print(f"  ✓ Replaced block at lines ~{i+1}-{j}")
                i = j
                continue
        
        result.append(lines[i])
        i += 1
    
    new_content = '\n'.join(result)
    
    # Verify we didn't accidentally lose too many lines
    if modified:
        # Check that the file looks reasonable
        if new_content.count('\n') < original.count('\n') * 0.5:
            print(f"  ⚠ WARNING: File shrunk dramatically ({len(original.split(chr(10)))} -> {len(new_content.split(chr(10)))} lines). Aborting!")
            return False
        
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"  ✓ Saved ({len(new_content.split(chr(10)))} lines, was {len(original.split(chr(10)))})")
        return True
    else:
        print(f"  - No try/except import blocks found")
        return False


def process_main_py():
    """Process main.py: add sys.path setup then replace try/except blocks."""
    filepath = os.path.join(BACKEND_DIR, 'main.py')
    print(f"Processing: main.py")
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Step 1: Add sys.path setup at the top (after docstring)
    lines = content.split('\n')
    
    # Find where the first import after the docstring is
    import_start = -1
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('from ') or stripped.startswith('import '):
            import_start = idx
            break
    
    if import_start > 0:
        sys_path_block = [
            'import sys',
            'from pathlib import Path',
            'sys.path.insert(0, str(Path(__file__).parent.resolve()))',
            '',
        ]
        # Insert after docstring and before imports
        new_lines = lines[:import_start] + sys_path_block + lines[import_start:]
        content = '\n'.join(new_lines)
        print(f"  ✓ Added sys.path setup before line {import_start + 1}")
        
        # Update lines for next step
        lines = content.split('\n')
    
    # Step 2: Now replace try/except blocks (same logic as process_file)
    result = []
    i = 0
    
    while i < len(lines):
        if lines[i].strip() == 'try:':
            j = i + 1
            try_import_lines = []
            while j < len(lines):
                stripped = lines[j].strip()
                if stripped.startswith('except ModuleNotFoundError:'):
                    break
                try_import_lines.append(lines[j])
                j += 1
            
            if j < len(lines) and lines[j].strip().startswith('except ModuleNotFoundError:'):
                j += 1
                
                except_import_lines = []
                while j < len(lines):
                    stripped = lines[j].strip()
                    if stripped == '':
                        except_import_lines.append(lines[j])
                        j += 1
                        continue
                    
                    # Check if continuation
                    if lines[j][0] not in ' \t':
                        break
                    if not (stripped.startswith('from ') or 
                            stripped.startswith('import ') or
                            stripped.startswith(',') or
                            stripped == '' or
                            stripped.startswith('        ') or
                            stripped.startswith('    ')):
                        break
                    
                    except_import_lines.append(lines[j])
                    j += 1
                
                while except_import_lines and except_import_lines[-1].strip() == '':
                    except_import_lines.pop()
                
                try_text = '\n'.join(try_import_lines)
                except_text = '\n'.join(except_import_lines)
                
                if 'backend.' not in try_text and try_text.strip():
                    clean_import = try_text
                elif 'backend.' not in except_text and except_text.strip():
                    clean_import = except_text
                elif try_text.strip():
                    clean_import = try_text.replace('from backend.', 'from ')
                elif except_text.strip():
                    clean_import = except_text.replace('from backend.', 'from ')
                else:
                    result.append(lines[i])
                    i += 1
                    continue
                
                clean_import = clean_import.replace('from backend.', 'from ')
                result.append(clean_import)
                print(f"  ✓ Replaced block at lines ~{i+1}-{j}")
                i = j
                continue
        
        result.append(lines[i])
        i += 1
    
    new_content = '\n'.join(result)
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"  ✓ Saved main.py ({len(new_content.split(chr(10)))} lines)")


def main():
    # Get all Python files with ModuleNotFoundError pattern
    import subprocess
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
    
    print(f"\nDone! {success} files modified successfully, {fail} files skipped/errored")


if __name__ == '__main__':
    main()
