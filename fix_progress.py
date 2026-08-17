import sys
import re

with open('src/components/AdminProjectManagerModal.tsx', 'r') as f:
    code = f.read()

# Replace main project progress slider
prog_search = """                <div>
                  <div className="flex justify-between text-[11px] text-[#EFE7DC]/80 font-bold mb-1.5">
                    <span>اسحب لتعديل النسبة مباشرة:</span>
                    <span>{progress}% من 100%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(parseInt(e.target.value))}
                    className="w-full h-2.5 bg-[#284430] rounded-lg appearance-none cursor-pointer accent-[#C5B198]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>"""

# Fallback pattern if the colors reverted slightly differently
prog_search_regex = r'<div>\s*<div className="flex justify-between text-\[11px\][^>]*>.*?<input\s*type="range".*?value=\{progress\}[^>]*>.*?</div>\s*</div>'

prog_replace = """                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-bold mb-2">
                    <span>تحديث النسبة الإجمالية:</span>
                    <span className="text-[#1C3022]">{progress}%</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[0, 25, 50, 75, 100].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setProgress(val)}
                        className={`py-2 rounded-xl text-xs font-black transition-all ${
                          progress === val
                            ? 'bg-[#1C3022] text-white shadow-sm'
                            : 'bg-white text-slate-500 border border-[#E8E2D8] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>"""

code = re.sub(prog_search_regex, prog_replace, code, flags=re.DOTALL)

# Replace phase progress slider
phase_prog_search = r'\{/\* Phase Progress Slider \*/\}.*?<input\s*type="range"[^>]*value=\{phase\.progress\}[^>]*onChange=\{e => handleUpdatePhase\(idx, \{ progress: parseInt\(e\.target\.value\) \}\)\}[^>]*>.*?</div>'

phase_prog_replace = """{/* Phase Progress Buttons */}
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
                          <span>نسبة إنجاز المرحلة:</span>
                          <span className="text-[#1C3022] font-black">{phase.progress}%</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[0, 25, 50, 75, 100].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleUpdatePhase(idx, { progress: val })}
                              className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                phase.progress === val
                                  ? 'bg-[#1C3022] text-white'
                                  : 'bg-white text-slate-500 border border-[#E8E2D8] hover:bg-[#FAF7F2]'
                              }`}
                            >
                              {val}%
                            </button>
                          ))}
                        </div>
                      </div>"""

code = re.sub(phase_prog_search, phase_prog_replace, code, flags=re.DOTALL)

with open('src/components/AdminProjectManagerModal.tsx', 'w') as f:
    f.write(code)

