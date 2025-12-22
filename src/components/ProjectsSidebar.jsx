'use client'

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRightIcon, SettingsIcon, KanbanIcon, ChartColumnIcon, CalendarIcon, ArrowRightIcon } from 'lucide-react';
import { useSelector } from 'react-redux';

const ProjectSidebar = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [expandedProjects, setExpandedProjects] = useState(new Set());

    const projects = useSelector(
        (state) => state?.workspace?.projects || []
    );

    const getProjectSubItems = (projectId) => [
        { title: 'Tasks', icon: KanbanIcon, tab: 'tasks' },
        { title: 'Analytics', icon: ChartColumnIcon, tab: 'analytics' },
        { title: 'Calendar', icon: CalendarIcon, tab: 'calendar' },
        { title: 'Settings', icon: SettingsIcon, tab: 'settings' }
    ];

    const toggleProject = (id) => {
        const newSet = new Set(expandedProjects);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setExpandedProjects(newSet);
    };

    return (
        <div className="mt-6 px-3">
            <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                    Projects
                </h3>
                <Link href="/projects" className="size-5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-900 rounded flex items-center justify-center transition-colors duration-200">
                    <ArrowRightIcon className="size-3" />
                </Link>
            </div>

            <div className="space-y-1 px-3">
                {projects.map((project) => (
                    <div key={project.id}>
                        <button onClick={() => toggleProject(project.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-white" >
                            <ChevronRightIcon className={`size-3 text-gray-500 dark:text-zinc-400 transition-transform duration-200 ${expandedProjects.has(project.id) && 'rotate-90'}`} />
                            <div className="size-2 rounded-full bg-red-500" />
                            <span className="truncate max-w-40 text-sm">{project.name}</span>
                        </button>

                        {expandedProjects.has(project.id) && (
                            <div className="ml-5 mt-1 space-y-1">
                                {getProjectSubItems(project.id).map((subItem) => {
                                    const isActive = pathname?.includes(`/projects/${project.id}`) && searchParams?.get('tab') === subItem.tab;

                                    return (
                                        <Link 
                                            key={subItem.title} 
                                            href={`/projects/${project.id}?tab=${subItem.tab}`}
                                            className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors duration-200 text-xs w-full text-left ${isActive ? 'bg-blue-100 text-red-600 hover:bg-blue-200 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20' : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-900'}`} 
                                        >
                                            <subItem.icon className="size-3" />
                                            {subItem.title}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectSidebar;