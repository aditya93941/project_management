import { useState } from "react";

const UserAvatar = ({ user, className = "size-8" }) => {
    const [imageError, setImageError] = useState(false);

    if (user?.image && !imageError) {
        return (
            <img
                src={user.image}
                alt={user.name || "avatar"}
                className={`${className} rounded-full object-cover`}
                onError={() => setImageError(true)}
            />
        );
    }

    const name = user?.name || '?';
    const initial = name[0] || '?';

    // Generate color
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];

    return (
        <div
            className={`${className} rounded-full flex items-center justify-center text-xs font-semibold text-white uppercase flex-shrink-0`}
            style={{ backgroundColor: color }}
        >
            {initial}
        </div>
    );
};

export default UserAvatar;
