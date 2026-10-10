import React, { useState } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Login({ setRole }: { setRole: any }) {
    const [email, setEmail] = useState('admin@restaurant.com');
    const [password, setPassword] = useState('admin123');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/staff-login', { email, password });
            localStorage.setItem('staff_token', res.data.token);
            setRole(res.data.role);
            navigate('/staff/kitchen');
        } catch (err) {
            alert('Невірний логін або пароль');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden text-slate-900 font-sans">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/30 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[120px]"></div>
            
            <form onSubmit={handleLogin} className="relative z-10 bg-slate-900/50 backdrop-blur-2xl p-10 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-sm text-center">
                <div className="w-16 h-16 bg-indigo-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-500/50">R</div>
                <h1 className="text-2xl font-bold mb-8 text-white tracking-tight">Вхід для персоналу</h1>
                
                <input className="w-full bg-slate-950/50 border border-slate-800 text-white p-4 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-500" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input className="w-full bg-slate-950/50 border border-slate-800 text-white p-4 rounded-xl mb-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-500" type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
                
                <button className="w-full bg-white text-black p-4 rounded-xl font-bold text-lg hover:bg-slate-200 active:scale-95 transition-all shadow-xl">Увійти</button>
                <div className="text-sm font-medium text-slate-500 mt-6 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                    <div>admin@restaurant.com / admin123</div>
                    <div>waiter@... / cook@...</div>
                </div>
            </form>
        </div>
    );
}
