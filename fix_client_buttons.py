import sys

with open('src/App.tsx', 'r') as f:
    code = f.read()

target = """                <div className="pt-2 flex gap-2 border-t border-[#F0EBE1]">
                  <button
                    type="button"
                    onClick={() => onCustomize(p)}
                    className="flex-1 bg-[#1C3022] text-white py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 hover:bg-[#122116] transition-all shadow-sm active:scale-[0.98]"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#C5B198]" />
                    <span>تخصيص وإدارة المشروع</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    className="px-3.5 py-2.5 bg-[#FAF7F2] text-[#1C3022] rounded-xl text-xs font-black flex items-center justify-center gap-1 border border-[#E8E2D8] hover:bg-[#EFE7DC] transition-all"
                  >
                    <span>التفاصيل</span>
                    <ChevronLeft className="w-3.5 h-3.5 text-[#A99379]" />
                  </button>
                </div>"""

replacement = """                <div className="pt-2 flex gap-2 border-t border-[#F0EBE1]">
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    className="flex-1 bg-[#1C3022] text-white py-3 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 hover:bg-[#122116] transition-all shadow-sm active:scale-[0.98]"
                  >
                    <Eye className="w-4 h-4 text-[#C5B198]" />
                    <span>الاطلاع على المشروع</span>
                  </button>
                </div>"""

code = code.replace(target, replacement)

# We also need to remove 'onCustomize' completely if it's unused, but it's fine to leave it in the signature.
# "و شيل طلبات العميل" -> We need to find "طلبات العميل" and remove it.

with open('src/App.tsx', 'w') as f:
    f.write(code)

