import sys
import re

with open('src/components/SupervisorViews.tsx', 'r') as f:
    code = f.read()

# Add import
import_stmt = "import { DeleteClientByAdminModal } from './DeleteClientByAdminModal';"
if "DeleteProjectByAdminModal" not in code:
    code = code.replace(import_stmt, import_stmt + "\nimport { DeleteProjectByAdminModal } from './DeleteProjectByAdminModal';")

# Add state to SupervisorProjectsView
# Search for:
# export function SupervisorProjectsView({ user, projects, ... }: SupervisorProjectsViewProps) {
#   const [searchQuery, setSearchQuery] = useState('');
#   const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
#   const [selectedProjectForManager, setSelectedProjectForManager] = useState<Project | null>(null);

state_search = "const [selectedProjectForManager, setSelectedProjectForManager] = useState<Project | null>(null);"
if "projectToDelete" not in code:
    code = code.replace(state_search, state_search + "\n  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);")

# Add trash button to project card
card_header_search = """                        <span className="text-[11px] font-black">{project.progress}%</span>
                      </div>
                    </div>
                  </div>"""

card_header_replace = """                        <span className="text-[11px] font-black">{project.progress}%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProjectToDelete(project)}
                        className="w-8 h-8 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm"
                        title="حذف المشروع"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>"""
if "setProjectToDelete" not in code.split("DeleteProjectByAdminModal")[0]: # quick check
    code = code.replace(card_header_search, card_header_replace)

# Render Modal at the end
modal_code = """      {/* DELETE PROJECT MODAL */}
      <AnimatePresence>
        {projectToDelete && (
          <DeleteProjectByAdminModal
            project={projectToDelete}
            onClose={() => setProjectToDelete(null)}
            onConfirmDelete={async (projectId, reason) => {
              try {
                // Find project
                const pToDel = projects.find(p => p.id === projectId);
                if (pToDel) {
                  // Update project to be deleted
                  await ProjectService.saveProject({
                    ...pToDel,
                    isDeleted: true,
                    deletedReason: reason,
                    deletedAt: new Date().toISOString(),
                    deletedBy: 'supervisor'
                  });
                  onRefreshProjects();
                  onRequestToast('تم حذف المشروع وإبلاغ العميل بنجاح');
                }
              } catch (err) {
                console.error(err);
                onRequestToast('حدث خطأ أثناء حذف المشروع');
              }
              setProjectToDelete(null);
            }}
            onRequestToast={onRequestToast}
          />
        )}
      </AnimatePresence>"""

# Find the end of the return statement of SupervisorProjectsView
end_search = """    </div>
  );
}"""

if "DeleteProjectByAdminModal" not in code.split("export function SupervisorClientsView")[0]:
    code = code.replace(end_search, modal_code + "\n    </div>\n  );\n}")

with open('src/components/SupervisorViews.tsx', 'w') as f:
    f.write(code)

