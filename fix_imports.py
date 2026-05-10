#!/usr/bin/env python3
"""
Fix try/except ModuleNotFoundError import patterns in backend Python files.
Replaces each try/except block with the clean 'from X import Y' (no 'backend.' prefix).
Also adds sys.path setup to main.py.
"""

import re
import os

BACKEND_DIR = '/home/rich27/retailbijak/backend'

def find_try_except_blocks(content):
    """Find all try/except ModuleNotFoundError blocks in content."""
    # Regex to match try/except ModuleNotFoundError blocks
    # This handles single-line and multi-line imports
    pattern = r'try:\s*\n(.*?)\nexcept ModuleNotFoundError:\s*\n(.*?)(?=\n\S|\Z)'
    # We need a more careful approach for multi-line blocks
    # Let's use a state machine
    
    blocks = []
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith('try:'):
            start = i
            i += 1
            # Collect try block lines
            try_lines = []
            while i < len(lines):
                strip_line = lines[i].strip()
                if strip_line.startswith('except ModuleNotFoundError:'):
                    break
                try_lines.append(lines[i])
                i += 1
            
            if i < len(lines):
                i += 1  # skip except ModuleNotFoundError: line
                
                # Collect except block lines
                except_lines = []
                while i < len(lines):
                    strip_line = lines[i].strip()
                    # Check if this line starts a new block (not continuation of import)
                    if strip_line and not strip_line.startswith('from ') and not strip_line.startswith('    from ') and not strip_line == '':
                        # But empty lines might be between blocks
                        if strip_line.startswith(('try:', 'except', 'def ', 'class ', '@', '#', 'import ', 'from ')) or any(strip_line.startswith(f'{kw} ') for kw in ['if', 'return', 'VALID', 'app.', 'router.', 'async ', 'with ', 'for ', 'while ']):
                            break
                    except_lines.append(lines[i])
                    i += 1
                
                blocks.append({
                    'start': start,
                    'end': i - 1,
                    'try_lines': try_lines,
                    'except_lines': except_lines
                })
        else:
            i += 1
    
    return blocks


def extract_import_lines(block_lines):
    """Extract full import lines (possibly multi-line with parenthesized imports)."""
    # Join the lines and extract the from ... import ... statement
    text = ''.join(block_lines)
    # Clean up indentation
    text = re.sub(r'^\s+', '', text, flags=re.MULTILINE)
    # Find the from ... import ... pattern
    match = re.search(r'(from\s+\S+\s+import\s+(?:\([^)]*\)|[^()]+))', text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return None


def get_clean_import(try_text, except_text):
    """Get the import line without 'backend.' prefix."""
    # Remove 'backend.' prefix from any import
    clean = re.sub(r'from\s+backend\.', 'from ', except_text)
    clean = re.sub(r'from\s+backend\.', 'from ', try_text)
    # Actually, we want the version without backend.
    # Check both and use the one without backend.
    if 'backend.' not in try_text:
        return try_text
    if 'backend.' not in except_text:
        return except_text
    # Both have backend? Remove backend. from either
    return re.sub(r'from\s+backend\.', 'from ', try_text)


def process_file(filepath):
    """Process a single file, replacing all try/except ModuleNotFoundError blocks."""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Use a more robust regex approach
    # Match try:\n (indented imports) \nexcept ModuleNotFoundError:\n (indented imports)
    # Pattern that handles multi-line parenthesized imports
    
    # Let's find the blocks more carefully
    # First, let's use a simpler approach: replace ALL try/except ModuleNotFoundError blocks
    
    # Pattern for single-line imports (no parentheses)
    # try:\n    from X import Y\nexcept ModuleNotFoundError:\n    from Z import Y
    pattern_single = re.compile(
        r'try:\n( +from \S+ import [^\n(]+)\nexcept ModuleNotFoundError:\n( +from \S+ import [^\n(]+)',
        re.MULTILINE
    )
    
    # Pattern for multi-line parenthesized imports
    # try:\n    from X import (\n        A,\n        B\n    )\nexcept ModuleNotFoundError:\n    from Z import (\n        A,\n        B\n    )
    # This is harder...
    
    # Let's use a different strategy: find each try/except block and handle it
    
    modified = False
    
    # Strategy: find 'try:' then find the matching 'except ModuleNotFoundError:'
    # then extract the import statements from both branches
    
    lines = content.split('\n')
    result_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        if stripped == 'try:':
            # Found a try block
            try_start = i
            i += 1
            
            # Collect try block body (indented lines)
            try_body_lines = []
            while i < len(lines):
                if lines[i].strip().startswith('except ModuleNotFoundError:'):
                    break
                try_body_lines.append(lines[i])
                i += 1
            
            if i < len(lines):
                i += 1  # skip 'except ModuleNotFoundError:' line
            
            except_body_lines = []
            while i < len(lines):
                stripped_line = lines[i].strip()
                # End conditions:
                # 1. Empty line followed by something not indented
                # 2. Line starts with a keyword at column 0 (try, def, class, etc.)
                # 3. Line is a non-indented import/from
                if stripped_line == '':
                    # Empty line - peek ahead to see if next non-empty line is a new statement
                    except_body_lines.append(lines[i])
                    i += 1
                    # Continue collecting - we'll trim trailing whitespace later
                    continue
                
                # Check if this line starts a new top-level block
                if lines[i][0] != ' ' and lines[i][0] != '\t':
                    # Non-indented line means the except block is done
                    break
                
                if stripped_line.startswith(('try:', 'except ', 'def ', 'class ', '@', '#', 'import ', 'from ', 'if ', 'return ', 'VALID_', 'app.', 'router.', 'async ', 'with ', 'for ', 'while ')):
                    # Check if it's really the start of a new thing or a continuation
                    if not stripped_line.startswith(('from ', 'import ')):
                        break
                
                except_body_lines.append(lines[i])
                i += 1
            
            # Now extract clean import from try or except body
            try_text = ''.join(try_body_lines)
            except_text = ''.join(except_body_lines)
            
            # Find the import statement in either block
            import_match = re.search(r'(from\s+\S+\s+import\s*(?:\([^)]*\)|[^()]*?)(?:\))?)', try_text + except_text, re.DOTALL)
            
            if import_match:
                full_import = import_match.group(1).strip()
                # Remove backend. prefix
                clean_import = re.sub(r'^from\s+backend\.', 'from ', full_import)
                # Normalize whitespace and line breaks
                clean_import = re.sub(r'\s+', ' ', clean_import)
                # Re-parenthesize if it's long  (keep multi-line if parenthesized)
                if '(' in full_import and ')' in full_import:
                    # Keep original formatting but without backend.
                    clean_import = full_import.replace('from backend.', 'from ')
                else:
                    clean_import = full_import.replace('from backend.', 'from ')
                
                result_lines.append(clean_import)
                modified = True
                print(f"  Replaced try/except block at lines ~{try_start+1}-{i}")
            else:
                # Couldn't find import pattern, keep original lines
                result_lines.extend(lines[try_start:i])
                print(f"  WARNING: Could not extract import from block at line {try_start+1}")
        else:
            result_lines.append(line)
            i += 1
    
    if modified:
        new_content = '\n'.join(result_lines)
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"  ✓ Modified")
    else:
        print(f"  - No changes needed")
    
    return modified


# First, let's handle main.py separately
def process_main_py():
    """Process main.py: add sys.path setup at top, then replace all try/except blocks."""
    filepath = os.path.join(BACKEND_DIR, 'main.py')
    print(f"Processing main.py: {filepath}")
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    # First pass: replace try/except blocks
    result_lines = []
    i = 0
    modified = False
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        if stripped == 'try:':
            try_start = i
            i += 1
            
            try_body_lines = []
            while i < len(lines):
                if lines[i].strip().startswith('except ModuleNotFoundError:'):
                    break
                try_body_lines.append(lines[i])
                i += 1
            
            if i < len(lines):
                i += 1  # skip except line
            
            except_body_lines = []
            while i < len(lines):
                stripped_line = lines[i].strip()
                if stripped_line == '':
                    except_body_lines.append(lines[i])
                    i += 1
                    continue
                
                if lines[i][0] != ' ' and lines[i][0] != '\t':
                    break
                
                # Check for new top-level statement
                if stripped_line.startswith(('try:', 'except ', 'def ', 'class ', '@', '#', 'if ', 'return ', 'VALID_', 'app.', 'router.', 'async ', 'with ', 'for ', 'while ', '\"\"\"', '|')):
                    break
                
                except_body_lines.append(lines[i])
                i += 1
            
            # Clean trailing empty lines from except_body
            while except_body_lines and except_body_lines[-1].strip() == '':
                except_body_lines.pop()
            
            try_text = '\n'.join(try_body_lines)
            except_text = '\n'.join(except_body_lines)
            
            # Find the import statement - try body first
            import_match = re.search(r'(from\s+\S+\s+import\s*(?:\([^)]*\)|[\s\S]*?)(?:\))?(?=\n|$))', try_text, re.DOTALL)
            if not import_match:
                import_match = re.search(r'(from\s+\S+\s+import\s*(?:\([^)]*\)|[\s\S]*?)(?:\))?(?=\n|$))', except_text, re.DOTALL)
            
            if import_match:
                full_import = import_match.group(1).strip()
                clean_import = full_import.replace('from backend.', 'from ')
                result_lines.append(clean_import)
                modified = True
                print(f"  Replaced try/except block at lines ~{try_start+1}-{i}")
            else:
                result_lines.extend(lines[try_start:i])
                print(f"  WARNING: Could not extract import from block at line {try_start+1}")
        else:
            result_lines.append(line)
            i += 1
    
    if modified:
        content = '\n'.join(result_lines)
        
        # Now add sys.path setup at the very top (after docstring, before imports)
        # Find where imports start (first line that starts with 'from ' or 'import ')
        lines = content.split('\n')
        
        # Find the first import line after the docstring
        insert_pos = 0
        in_docstring = False
        for idx, line in enumerate(lines):
            if line.strip().startswith('"""'):
                if not in_docstring:
                    in_docstring = True
                else:
                    in_docstring = False
                    insert_pos = idx + 1
            elif not in_docstring and line.strip().startswith(('from ', 'import ', '# import')):
                insert_pos = idx
                break
        
        # Insert sys.path setup before first import
        sys_path_lines = [
            'import sys',
            'from pathlib import Path',
            'sys.path.insert(0, str(Path(__file__).parent.resolve()))',
            '',
        ]
        
        # Insert after docstring and before first import
        new_lines = lines[:insert_pos] + sys_path_lines + lines[insert_pos:]
        # Remove duplicate 'from pathlib import Path' if it already exists in the original imports
        # Actually let's check - the original has 'from pathlib import Path' but we need to keep the sys.path setup
        
        new_content = '\n'.join(new_lines)
        
        # Remove duplicate 'from pathlib import Path' - but we'll keep both for safety, Python handles it fine
        # Actually let's clean it up: remove the existing 'from pathlib import Path' since we added it before imports
        
        # Let's check if the first import after our insertion is 'from pathlib import Path'
        # Better approach: just add the sys.path lines and keep existing imports as-is (Python handles duplicates fine)
        
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"  ✓ Modified main.py with sys.path setup + cleaned imports")
    else:
        print(f"  - No changes needed for main.py")


# Process all files with try/except patterns
def main():
    # Get all Python files in backend directory with ModuleNotFoundError patterns
    import subprocess
    result = subprocess.run(
        ['grep', '-rl', 'except ModuleNotFoundError', BACKEND_DIR, '--include=*.py'],
        capture_output=True, text=True
    )
    files = result.stdout.strip().split('\n')
    files = [f for f in files if f]  # Remove empty strings
    
    # Filter out test files
    test_files = ['test_ui_contract.py', 'test_api_e2e.py', 'test_ui_data_contract.py']
    files = [f for f in files if os.path.basename(f) not in test_files]
    
    print(f"Found {len(files)} files to process")
    
    for filepath in files:
        process_file(filepath)
    
    print("\nDone!")


if __name__ == '__main__':
    main()
