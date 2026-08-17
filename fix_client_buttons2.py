import sys
import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

pattern = r'<div className="pt-2 flex gap-2 border-t border-\[#F0EBE1\]">.*?</div>'
replacement = """<div className="pt-2 flex gap-2 border-t border-[#F0EBE1]">
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    className="flex-1 bg-[#1C3022] text-white py-3 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 hover:bg-[#122116] transition-all shadow-sm active:scale-[0.98]"
                  >
                    <Eye className="w-4 h-4 text-[#C5B198]" />
                    <span>الاطلاع على المشروع</span>
                  </button>
                </div>"""

# Ensure we use DOTALL to match across lines
new_code = re.sub(pattern, replacement, code, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(new_code)
