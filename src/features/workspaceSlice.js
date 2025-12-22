import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    projects: [],
    loading: false,
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setProjects: (state, action) => {
            state.projects = action.payload;
        },
        addProject: (state, action) => {
            state.projects.push(action.payload);
        },
        updateProject: (state, action) => {
            state.projects = state.projects.map((p) =>
                p.id === action.payload.id ? action.payload : p
            );
        },
        deleteProject: (state, action) => {
            state.projects = state.projects.filter((p) => p.id !== action.payload);
        },
        addTask: (state, action) => {
            state.projects = state.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.tasks = p.tasks || [];
                    p.tasks.push(action.payload);
                }
                return p;
            });
        },
        updateTask: (state, action) => {
            state.projects = state.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.tasks = (p.tasks || []).map((t) =>
                        t.id === action.payload.id ? action.payload : t
                    );
                }
                return p;
            });
        },
        deleteTask: (state, action) => {
            state.projects = state.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.tasks = (p.tasks || []).filter((t) => !action.payload.taskIds.includes(t.id));
                }
                return p;
            });
        }
    }
});

export const { setProjects, addProject, updateProject, deleteProject, addTask, updateTask, deleteTask } = workspaceSlice.actions;
export default workspaceSlice.reducer;
