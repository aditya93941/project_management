'use client'

import { X, AlertTriangle } from "lucide-react";

const DeleteConfirmationDialog = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Delete Item",
    message = "Are you sure you want to delete this item? This action cannot be undone.",
    confirmText = "Delete",
    cancelText = "Cancel",
    isLoading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200 relative">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                        <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
                            {message}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Deleting...' : confirmText}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-50"
                    >
                        <X className="size-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationDialog;

