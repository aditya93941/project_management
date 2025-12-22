// In Next.js, public assets are referenced with paths starting from /
// These will be served from the public/ directory
export const assets = {
    workspace_img_default: '/workspace_img_default.svg',
    profile_img_a: '/profile_img_a.svg',
    profile_img_o: '/profile_img_o.svg',
    profile_img_j: '/profile_img_j.svg',
}

// Dummy data for development
export const dummyUsers = [
    {
        "id": "user_1",
        "name": "Alex Smith",
        "email": "alexsmith@example.com",
        "image": "/profile_img_a.svg",
        "createdAt": "2025-10-06T11:04:03.485Z",
        "updatedAt": "2025-10-06T11:04:03.485Z"
    },
    {
        "id": "user_2",
        "name": "John Warrel",
        "email": "johnwarrel@example.com",
        "image": "/profile_img_j.svg",
        "createdAt": "2025-10-09T13:20:24.360Z",
        "updatedAt": "2025-10-09T13:20:24.360Z"
    },
    {
        "id": "user_3",
        "name": "Oliver Watts",
        "email": "oliverwatts@example.com",
        "image": "/profile_img_o.svg",
        "createdAt": "2025-09-01T04:31:22.043Z",
        "updatedAt": "2025-09-26T09:03:37.866Z"
    }
]

// Dummy projects for development (workspace removed)
export const dummyProjects = [
    {
        "id": "4d0f6ef3-e798-4d65-a864-00d9f8085c51",
        "name": "LaunchPad CRM",
        "description": "A next-gen CRM for startups to manage customer pipelines, analytics, and automation.",
        "priority": "HIGH",
        "status": "ACTIVE",
        "start_date": "2025-10-10T00:00:00.000Z",
        "end_date": "2026-02-28T00:00:00.000Z",
        "team_lead": "user_3",
        "progress": 65,
        "createdAt": "2025-10-13T08:01:35.491Z",
        "updatedAt": "2025-10-13T08:01:45.620Z",
        "tasks": [
            {
                "id": "24ca6d74-7d32-41db-a257-906a90bca8f4",
                "projectId": "4d0f6ef3-e798-4d65-a864-00d9f8085c51",
                "title": "Design Dashboard UI",
                "description": "Create a modern, responsive CRM dashboard layout.",
                "status": "IN_PROGRESS",
                "type": "FEATURE",
                "priority": "HIGH",
                "assigneeId": "user_1",
                "due_date": "2025-10-31T00:00:00.000Z",
                "createdAt": "2025-10-13T08:04:04.084Z",
                "updatedAt": "2025-10-13T08:04:04.084Z",
                "assignee": dummyUsers[0],
                "comments": []
            },
            {
                "id": "9dbd5f04-5a29-4232-9e8c-a1d8e4c566df",
                "projectId": "4d0f6ef3-e798-4d65-a864-00d9f8085c51",
                "title": "Integrate Email API",
                "description": "Set up SendGrid integration for email campaigns.",
                "status": "TODO",
                "type": "TASK",
                "priority": "MEDIUM",
                "assigneeId": "user_2",
                "due_date": "2025-11-30T00:00:00.000Z",
                "createdAt": "2025-10-13T08:10:31.922Z",
                "updatedAt": "2025-10-13T08:10:31.922Z",
                "assignee": dummyUsers[1],
                "comments": []
            }
        ],
        "members": [
            {
                "id": "17dc3764-737f-4584-9b54-d1a3b401527d",
                "userId": "user_1",
                "projectId": "4d0f6ef3-e798-4d65-a864-00d9f8085c51",
                "user": dummyUsers[0]
            },
            {
                "id": "774b0f38-7fd7-431a-b3bd-63262f036ca9",
                "userId": "user_2",
                "projectId": "4d0f6ef3-e798-4d65-a864-00d9f8085c51",
                "user": dummyUsers[1]
            }
        ]
    }
]
