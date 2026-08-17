import sys

with open('src/App.tsx', 'r') as f:
    code = f.read()

target = """        {/* Middle Section */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 space-y-3 mb-8">
          <h3 className="text-sm text-[#1C3022] font-medium opacity-90">مرحباً بك في</h3>
          <h2 className="text-3xl font-black text-[#1C3022] tracking-wide">نماذج التميز</h2>
          <p className="text-center text-xs text-[#EFE7DC]/70 max-w-xs leading-relaxed mt-2 font-medium">
            حلول هندسية مبتكرة لتنفيذ مشاريعك<br />بأعلى معايير الجودة والاحترافية
          </p>
        </div>"""

code = code.replace(target, "")

with open('src/App.tsx', 'w') as f:
    f.write(code)
