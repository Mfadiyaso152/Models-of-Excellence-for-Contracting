import sys
import glob
import os

files = glob.glob('src/components/*.tsx') + ['src/App.tsx']

replacements = [
    ('bg-[#0B1510]', 'bg-[#FAF7F2]'),
    ('bg-[#122119]', 'bg-white'),
    ('border-[#2A3A2F]', 'border-[#E8E2D8]'),
    ('text-[#F8F5F0]/60', 'text-slate-500'),
    ('text-[#F8F5F0]/50', 'text-slate-400'),
    ('text-[#F8F5F0]/70', 'text-slate-600'),
    ('text-[#F8F5F0]/40', 'text-slate-400'),
    ('text-[#F8F5F0]', 'text-[#1C3022]'),
    ('text-[#D0A97E]', 'text-[#C5B198]'),
    ('bg-[#D0A97E]', 'bg-[#1C3022]'),
    ('text-[#1C3022]', 'text-white'), # Because we replaced bg-[#1C3022] text-white with bg-[#D0A97E] text-[#1C3022] earlier
    ('hover:bg-[#C29B70]', 'hover:bg-[#122116]'),
    ('bg-[#1A2E23]', 'bg-[#EFE7DC]'),
    ('hover:bg-[#1A2E23]', 'hover:bg-[#EFE7DC]'),
]

for filepath in files:
    with open(filepath, 'r') as f:
        code = f.read()
    
    # Pre-step: since we changed text-[#1C3022] to text-white in the line above,
    # we need to be careful. Let's do exact replacements for the primary button pattern.
    code = code.replace('bg-[#D0A97E] hover:bg-[#C29B70] text-[#1C3022]', 'bg-[#1C3022] hover:bg-[#122116] text-white')
    code = code.replace('bg-[#D0A97E] text-[#1C3022] hover:bg-[#C29B70]', 'bg-[#1C3022] text-white hover:bg-[#122116]')
    
    for old, new in replacements:
        if old not in ['bg-[#D0A97E]', 'hover:bg-[#C29B70]', 'text-[#1C3022]']: # Skip already processed
            code = code.replace(old, new)
            
    # Quick fix for text-white that got messed up if any
    code = code.replace('text-white/60', 'text-white/60') # doesn't matter
    
    with open(filepath, 'w') as f:
        f.write(code)

print("Colors reverted")
