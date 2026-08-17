import sys
import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Add handling for isDeleted in ProjectsListView
list_view_search = """        <div className="space-y-4">
          {projects.map(p => ("""

list_view_replace = """        <div className="space-y-4">
          {projects.map(p => {
            if (p.isDeleted) {
              return (
                <div key={p.id} className="bg-red-50 border border-red-200 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    <h4 className="font-black text-sm">مشروع ملغي: {p.title}</h4>
                  </div>
                  <p className="text-xs text-red-800 font-bold leading-relaxed">
                    تم حذف وإلغاء هذا المشروع من قبل المشرف.
                  </p>
                  <div className="bg-white/60 rounded-xl p-3 border border-red-100">
                    <span className="text-[10px] text-red-400 font-black block mb-1">سبب الحذف والإلغاء:</span>
                    <p className="text-xs text-red-900 font-medium leading-relaxed">{p.deletedReason || 'لا يوجد سبب محدد'}</p>
                  </div>
                  {p.deletedAt && (
                    <span className="text-[9px] text-red-400 font-black block pt-1">
                      تاريخ الحذف: {new Date(p.deletedAt).toLocaleDateString('ar-SA')}
                    </span>
                  )}
                </div>
              );
            }
            return ("""

code = code.replace(list_view_search, list_view_replace)

# Close the new map block properly
end_map_search = """                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>"""

end_map_replace = """                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>"""

code = code.replace(end_map_search, end_map_replace)

with open('src/App.tsx', 'w') as f:
    f.write(code)

