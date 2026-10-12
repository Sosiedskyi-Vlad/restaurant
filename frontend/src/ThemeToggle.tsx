import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export function useTheme() {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') return saved;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return { theme, toggle };
}

export default function ThemeToggle({ 
    theme: propTheme,
    toggle: propToggle,
    className = '' 
}: { 
    theme?: 'light' | 'dark';
    toggle?: () => void;
    className?: string;
}) {
    const defaultHook = useTheme();
    const theme = propTheme ?? defaultHook.theme;
    const toggle = propToggle ?? defaultHook.toggle;

    return (
        <button 
            type="button"
            onClick={toggle} 
            className={`p-2 rounded-xl transition-colors ${className}`} 
            title={theme === 'dark' ? 'Перемкнути на світлу тему' : 'Перемкнути на темну тему'}
        >
            {theme === 'dark' ? (
                <SunIcon className="w-5 h-5 text-amber-400" />
            ) : (
                <MoonIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            )}
        </button>
    );
}
