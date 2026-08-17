import sys
import re

with open('src/components/SupervisorViews.tsx', 'r') as f:
    code = f.read()

search = """  const filteredProjects = projects.filter(p => {
    if (selectedClientFilter && p.clientId !== selectedClientFilter) return false;"""

replace = """  const filteredProjects = projects.filter(p => {
    if (p.isDeleted) return false;
    if (selectedClientFilter && p.clientId !== selectedClientFilter) return false;"""

code = code.replace(search, replace)

with open('src/components/SupervisorViews.tsx', 'w') as f:
    f.write(code)
