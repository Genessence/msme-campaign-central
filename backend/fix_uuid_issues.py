#!/usr/bin/env python3
"""
Script to fix all PostgreSQL UUID issues and switch to SQLite-compatible String UUIDs
"""
import os
import re
from pathlib import Path

def fix_uuid_in_file(file_path):
    """Fix UUID imports and column definitions in a Python file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Remove PostgreSQL UUID import
        content = re.sub(r'from sqlalchemy\.dialects\.postgresql import UUID\n', '', content)
        
        # Fix UUID column definitions with primary key
        content = re.sub(
            r'Column\(UUID\(as_uuid=True\), primary_key=True, default=uuid\.uuid4\)',
            'Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))',
            content
        )
        
        # Fix UUID column definitions with foreign keys
        content = re.sub(
            r'Column\(UUID\(as_uuid=True\), ForeignKey\(([^)]+)\)([^)]*)\)',
            r'Column(String, ForeignKey(\1)\2)',
            content
        )
        
        # Fix standalone UUID columns
        content = re.sub(
            r'Column\(UUID\(as_uuid=True\)([^)]*)\)',
            r'Column(String\1)',
            content
        )
        
        # If content changed, write back to file
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed UUID issues in: {file_path}")
            return True
        
        return False
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def fix_schema_uuids(file_path):
    """Fix UUID type hints in schema files"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Remove uuid import if it's not used elsewhere
        if 'uuid.UUID' in content and 'uuid.uuid4' not in content:
            content = re.sub(r'import uuid\n', '', content)
        
        # Fix UUID type hints
        content = re.sub(r':\s*uuid\.UUID', ': str', content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed UUID type hints in: {file_path}")
            return True
        
        return False
        
    except Exception as e:
        print(f"Error processing schema {file_path}: {e}")
        return False

def main():
    backend_dir = Path(__file__).parent
    
    # Fix model files
    models_dir = backend_dir / "app" / "models"
    for model_file in models_dir.glob("*.py"):
        if model_file.name != "__init__.py":
            fix_uuid_in_file(model_file)
    
    # Fix schema files
    schemas_dir = backend_dir / "app" / "schemas"
    for schema_file in schemas_dir.glob("*.py"):
        if schema_file.name != "__init__.py":
            fix_schema_uuids(schema_file)
    
    print("UUID fix process completed!")

if __name__ == "__main__":
    main()
