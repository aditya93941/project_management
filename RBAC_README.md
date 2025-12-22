# Role-Based Access Control (RBAC) Guide

## Overview
This project uses a hierarchical role-based access control system with 4 roles, ordered from highest to lowest authority:

1. **MANAGER** (Superadmin) - Level 4
2. **GROUP_HEAD** (Admin) - Level 3
3. **TEAM_LEAD** - Level 2
4. **DEVELOPER** - Level 1

---

## Role Permissions

### 🔴 MANAGER (Superadmin)
**Highest authority - Full system access**

#### ✅ CAN DO:
- View Admin Panel
- Create, edit, and delete users
- Change user roles
- Manage temporary permissions (grant/revoke)
- View all EOD summaries and reports
- Create, edit, and delete projects
- Add/remove project members
- Create, edit, and delete tasks
- Edit all task details (title, description, type, priority, assignee, due date)
- Edit task status
- Invite team members globally
- Access all features and data

#### ❌ CANNOT DO:
- Nothing - Full access to everything

---

### 🔵 GROUP_HEAD (Admin)
**High authority - Administrative access**

#### ✅ CAN DO:
- View Admin Panel
- Manage temporary permissions (grant/revoke)
- View all EOD summaries and reports
- Create, edit, and delete projects
- Add/remove project members
- Create, edit, and delete tasks
- Edit all task details (title, description, type, priority, assignee, due date)
- Edit task status
- Invite team members globally

#### ❌ CANNOT DO:
- Create or delete users
- Change user roles

---

### 🟢 TEAM_LEAD
**Moderate authority - Project management access**

#### ✅ CAN DO:
- Create projects
- Add members to their projects
- Create tasks
- Edit task details (only for tasks they created)
- Edit task status (for tasks they created or are assigned to)
- View projects and tasks
- Submit EOD reports

#### ❌ CANNOT DO:
- View Admin Panel
- Delete projects
- View EOD summaries (manager view)
- Invite team members globally
- Manage temporary permissions
- Edit tasks created by others (except status if assigned)

---

### 🟡 DEVELOPER
**Basic authority - Limited access**

#### ✅ CAN DO:
- View projects (if member)
- View tasks
- Edit task status (only for tasks assigned to them)
- Create tasks (only with temporary permission granted by Manager/Group Head)
- Request temporary permissions for task creation
- Submit EOD reports
- View own tasks and assignments

#### ❌ CANNOT DO:
- Create projects
- Delete projects
- Edit task details (title, description, type, priority, assignee, due date)
- Create tasks (without temporary permission)
- Add/remove project members
- View Admin Panel
- View EOD summaries (manager view)
- Invite team members
- Manage temporary permissions
- Edit tasks created by others (except status if assigned)

---

## Special Permissions

### Temporary Permissions
- **Who can grant:** MANAGER, GROUP_HEAD
- **Who can request:** DEVELOPER
- **What it allows:** Developers can temporarily create and assign tasks within a specific project
- **Duration:** Set by the granting authority (with expiration date)

### Task Editing Rules
- **Full Edit Access:** MANAGER, GROUP_HEAD, or task creator
- **Status Only:** Task assignee can only change task status
- **No Access:** Developers without temporary permission cannot edit task details

### Project Access
- **Create Projects:** MANAGER, GROUP_HEAD, TEAM_LEAD
- **Delete Projects:** MANAGER, GROUP_HEAD only
- **Add Members:** MANAGER, GROUP_HEAD, TEAM_LEAD (to their own projects)

### EOD Reports
- **Submit Reports:** All roles
- **View Summaries:** MANAGER, GROUP_HEAD only

---

## Permission Hierarchy

Higher roles inherit permissions from lower roles:
- **MANAGER** has all permissions
- **GROUP_HEAD** has TEAM_LEAD + DEVELOPER permissions + admin features
- **TEAM_LEAD** has DEVELOPER permissions + project creation
- **DEVELOPER** has basic viewing permissions

---

## Quick Reference

| Feature | MANAGER | GROUP_HEAD | TEAM_LEAD | DEVELOPER |
|---------|---------|------------|-----------|-----------|
| Admin Panel | ✅ | ✅ | ❌ | ❌ |
| Create Users | ✅ | ❌ | ❌ | ❌ |
| Manage Permissions | ✅ | ✅ | ❌ | ❌ |
| View EOD Summaries | ✅ | ✅ | ❌ | ❌ |
| Create Projects | ✅ | ✅ | ✅ | ❌ |
| Delete Projects | ✅ | ✅ | ❌ | ❌ |
| Create Tasks | ✅ | ✅ | ✅ | ⚠️* |
| Edit Task Details | ✅ | ✅ | ⚠️** | ❌ |
| Edit Task Status | ✅ | ✅ | ⚠️*** | ⚠️*** |
| Invite Members | ✅ | ✅ | ❌ | ❌ |
| Add Project Members | ✅ | ✅ | ✅ | ❌ |

*Only with temporary permission  
**Only for tasks they created  
***Only for tasks they created or are assigned to

