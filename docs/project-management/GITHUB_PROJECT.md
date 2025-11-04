# GitHub Project Integration

This repository is integrated with GitHub Project: **[WinCC OA Projects Extension](https://github.com/users/mPokornyETM/projects/3)**

## 🎯 Automatic Project Management

### ✅ **What Happens Automatically**

1. **New Issues** → Automatically added to project
2. **New Pull Requests** → Automatically added to project
3. **Issue Templates** → Pre-configured with project assignment
4. **PR Template** → Pre-configured with project assignment

### 🏷️ **Label-Based Organization**

Issues and PRs are automatically categorized based on labels:

| Label           | Project Status  | Description                        |
| --------------- | --------------- | ---------------------------------- |
| `bug`           | 🐛 Bug          | Bug fixes and issue reports        |
| `enhancement`   | 🚀 Feature      | New features and improvements      |
| `dependencies`  | 📦 Dependencies | Dependency updates from Dependabot |
| `documentation` | 📚 Docs         | Documentation improvements         |
| `chore`         | 🔧 Maintenance  | Maintenance and tooling updates    |

### 📋 **Project Workflow**

1. **Triage** - New items start here
2. **Backlog** - Planned work
3. **In Progress** - Currently being worked on
4. **Review** - Awaiting review/testing
5. **Done** - Completed work

### 🔧 **Manual Project Management**

You can also manage items manually in the project:

- **View Project**: https://github.com/users/mPokornyETM/projects/3
- **Move items** between status columns
- **Set priorities** (High, Medium, Low)
- **Add custom fields** as needed
- **Filter and sort** by various criteria

### ⚙️ **Configuration Files**

- **Issue Templates**: `.github/ISSUE_TEMPLATE/*.md` - Include `projects: ['mPokornyETM/3']`
- **PR Template**: `.github/pull_request_template.md` - Include `projects: ['mPokornyETM/3']`
- **Automation**: `.github/workflows/add-to-project.yml` - Handles automatic assignment

### 🚀 **Benefits**

- ✅ **Complete Tracking** - All issues and PRs automatically tracked
- ✅ **Visual Progress** - See work status at a glance
- ✅ **Better Planning** - Organize work into sprints/milestones
- ✅ **Team Collaboration** - Share project status with stakeholders
- ✅ **Automated Workflow** - Less manual project management

---

_The project integration ensures nothing falls through the cracks and provides a centralized view of all repository activity._
