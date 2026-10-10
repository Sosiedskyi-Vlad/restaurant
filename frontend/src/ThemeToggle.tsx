import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export function useTheme() {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);
    const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
    return { theme, toggle };
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
    const { theme, toggle } = useTheme();
    return (
        <button onClick={toggle} className={`p-2 rounded-xl transition-colors ${className}`} title="Змінити тему">
            {theme === 'dark' ? <SunIcon className="w-6 h-6 text-amber-400" /> : <MoonIcon className="w-6 h-6 text-slate-600" />}
        </button>
    );
}
