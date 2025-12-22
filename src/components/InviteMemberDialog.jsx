'use client'

import { useState, useEffect } from "react";
import { XIcon, Mail, UserPlus, Lock, User } from "lucide-react";
import toast from "react-hot-toast";
import { useCreate, useUpdate, useList } from "@refinedev/core";
import { getApiUrl } from "../constants";

const InviteMemberDialog = ({ isDialogOpen, setIsDialogOpen, userToEdit = null }) => {
    const [formData, setFormData] = useState({
        email: "",
        name: "",
        role: "DEVELOPER",
        password: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const { mutate: createUser } = useCreate();
    const { mutate: updateUser } = useUpdate();
    
    // Fetch all users to check for existing email
    const { data: usersData } = useList({
        resource: 'users',
        queryOptions: {
            enabled: false, // Only fetch when needed
        },
    });

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                email: userToEdit.email || "",
                name: userToEdit.name || "",
                role: userToEdit.role || "DEVELOPER",
                password: "", // Don't pre-fill password for security
            });
        } else {
            setFormData({
                email: "",
                name: "",
                role: "DEVELOPER",
                password: "",
            });
        }
    }, [userToEdit, isDialogOpen]);

    // Check if email already exists
    const checkEmailExists = async (email) => {
        if (!email || !email.trim()) return false
        
        try {
            const API_URL = getApiUrl()
            const token = localStorage.getItem('auth_token')
            const response = await fetch(`${API_URL}/users?email=${encodeURIComponent(email.trim().toLowerCase())}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })
            
            if (!response.ok) {
                // If endpoint doesn't support email query, check in fetched users
                const users = usersData?.data || []
                return users.some(user => 
                    user.email?.toLowerCase() === email.trim().toLowerCase() &&
                    (!userToEdit || (user.id || user._id) !== (userToEdit.id || userToEdit._id))
                )
            }
            
            const data = await response.json()
            // Check if any user matches (excluding current user if editing)
            if (Array.isArray(data.data)) {
                return data.data.some(user => 
                    user.email?.toLowerCase() === email.trim().toLowerCase() &&
                    (!userToEdit || (user.id || user._id) !== (userToEdit.id || userToEdit._id))
                )
            }
            
            return false
        } catch (error) {
            // Fallback: check in fetched users list
            const users = usersData?.data || []
            return users.some(user => 
                user.email?.toLowerCase() === email.trim().toLowerCase() &&
                (!userToEdit || (user.id || user._id) !== (userToEdit.id || userToEdit._id))
            )
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Check if email already exists (only for new users)
        if (!userToEdit) {
            setIsCheckingEmail(true)
            const emailExists = await checkEmailExists(formData.email)
            setIsCheckingEmail(false)
            
            if (emailExists) {
                toast.error('A user with this email already exists. Please use a different email address.')
                return
            }
        }
        
        setIsSubmitting(true);
        
        try {
            const isEditMode = !!userToEdit;
            toast.loading(isEditMode ? "Updating member..." : "Sending invitation...");
            
            // Generate initials from name (first letter + first letter after space)
            const generateInitials = (name) => {
                if (!name) return '';
                const parts = name.trim().split(/\s+/);
                if (parts.length === 1) {
                    return parts[0].charAt(0).toUpperCase();
                }
                return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
            };
            
            const initials = generateInitials(formData.name || formData.email);
            
            const commonValues = {
                email: formData.email,
                name: formData.name,
                role: formData.role,
                image: initials,
            };

            if (isEditMode) {
                // Update existing user - password is handled by the user themselves in profile settings
                const updateValues = { ...commonValues };
                // Password field removed - users should change their own password via profile settings

                updateUser({
                    resource: 'users',
                    id: userToEdit._id || userToEdit.id,
                    values: updateValues,
                }, {
                    onSuccess: () => {
                        toast.dismissAll();
                        toast.success("Member updated successfully");
                        handleClose();
                    },
                    onError: (error) => {
                        toast.dismissAll();
                        toast.error(error?.message || "Failed to update member");
                    }
                });
            } else {
                // Create new user
                const defaultPassword = formData.password || `Welcome${Math.random().toString(36).slice(-8)}!`;
                
                createUser({
                    resource: 'users',
                    values: {
                        ...commonValues,
                        password: defaultPassword,
                        localCreatedAt: new Date().toLocaleString(),
                    },
                }, {
                    onSuccess: () => {
                        toast.dismissAll();
                        toast.success("Invitation sent successfully! User has been created.");
                        handleClose();
                    },
                    onError: (error) => {
                        toast.dismissAll();
                        toast.error(error?.message || "Failed to send invitation");
                    },
                });
            }
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.message || "Failed to process request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            email: "",
            name: "",
            role: "DEVELOPER",
            password: "",
        });
        setIsDialogOpen(false);
    };

    if (!isDialogOpen) return null;

    const isEditMode = !!userToEdit;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg text-zinc-900 dark:text-zinc-200 relative">
                <button 
                    className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" 
                    onClick={handleClose}
                >
                    <XIcon className="size-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/10">
                        <UserPlus className="w-5 h-5 text-red-500 dark:text-red-200" />
                    </div>
                    <h2 className="text-xl font-medium">{isEditMode ? "Edit Team Member" : "Invite Team Member"}</h2>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                    {isEditMode 
                        ? "Update the team member's details below." 
                        : "Send an invitation to add a new member to your team."}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500 w-4 h-4" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="colleague@example.com"
                                className="w-full pl-10 pr-3 py-2 rounded dark:bg-black border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* Name (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Name (Optional)
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500 w-4 h-4" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="John Doe"
                                className="w-full pl-10 pr-3 py-2 rounded dark:bg-black border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
                            />
                        </div>
                    </div>

                    {/* Password - Only show for new users, not in edit mode */}
                    {!isEditMode && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Password (Optional - auto-generated if blank)
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500 w-4 h-4" />
                                <input
                                    type="text"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Leave blank for auto-generation"
                                    className="w-full pl-10 pr-3 py-2 rounded dark:bg-black border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Role
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
                        >
                            <option value="DEVELOPER">Developer</option>
                            <option value="TEAM_LEAD">Team Lead</option>
                            <option value="GROUP_HEAD">Group Head (Admin)</option>
                            <option value="MANAGER">Manager (Superadmin)</option>
                        </select>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Select the appropriate role for the team member.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-900 text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isCheckingEmail}
                            className="px-4 py-2 rounded bg-gradient-to-br from-red-500 to-red-600 text-white dark:text-zinc-200 text-sm hover:opacity-90 transition disabled:opacity-50"
                        >
                            {isCheckingEmail ? "Checking..." : isSubmitting ? (isEditMode ? "Updating..." : "Sending...") : (isEditMode ? "Update Member" : "Send Invitation")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteMemberDialog;

