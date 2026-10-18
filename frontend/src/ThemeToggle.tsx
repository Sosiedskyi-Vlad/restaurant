import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export function useTheme() {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') return saved;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            if (metaTheme) metaTheme.setAttribute('content', '#020617');
        } else {
            document.documentElement.classList.remove('dark');
            if (metaTheme) metaTheme.setAttribute('content', '#ffffff');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return { theme, toggle };
}

export default function ThemeToggle({ 
    theme: propTheme,
    toggle: propToggle,
    className = '',
    iconClassName = ''
}: { 
    theme?: 'light' | 'dark';
    toggle?: () => void;
    className?: string;
    iconClassName?: string;
}) {
    const defaultHook = useTheme();
    const theme = propTheme ?? defaultHook.theme;
    const toggle = propToggle ?? defaultHook.toggle;

    const buttonClass = className || "p-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300";
    const iconClass = iconClassName || "w-5 h-5";

    return (
        <button 
            type="button"
            onClick={toggle} 
            className={buttonClass} 
            title={theme === 'dark' ? 'Перемкнути на світлу тему' : 'Перемкнути на темну тему'}
        >
            {theme === 'dark' ? (
                <SunIcon className={`${iconClass} text-amber-400`} />
            ) : (
                <MoonIcon className={`${iconClass} text-slate-600 dark:text-slate-300`} />
            )}
        </button>
    );
}
