import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import GuestApp from './GuestApp';
import StaffApp from './StaffApp';
import Login from './pages/Login';
import { api } from './api';

export default function App() {
  const [role, setRole] = useState<string | null>(null);
  const search = new URLSearchParams(useLocation().search);
  const qr = search.get('qr');
  const navigate = useNavigate();

  useEffect(() => {
    const isStaffUrl = window.location.pathname.startsWith('/staff');
    const tokenKey = isStaffUrl ? 'staff_token' : 'guest_token';
    const token = localStorage.getItem(tokenKey);

    if (qr) {
      api.post('/auth/table-login', { qrHash: qr })
        .then(res => {
          localStorage.setItem('guest_token', res.data.token);
          localStorage.setItem('guest_table_num', res.data.tableNumber); // зберігаємо гарний номер
          setRole(res.data.role); // ROLE_GUEST
          navigate('/', { replace: true });
        }).catch(() => alert('Недійсний QR-код'));
    } else if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Перевірка терміну дії токена (exp в секундах)
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          localStorage.removeItem(tokenKey);
          setRole(null);
        } else {
          setRole(payload.role);
        }
      } catch (e) {
        localStorage.removeItem(tokenKey);
        setRole(null);
      }
    } else {
      setRole(null);
    }
  }, [qr, window.location.pathname]);

  return (
    <Routes>
      <Route path="/login" element={<Login setRole={setRole} />} />
      {role === 'ROLE_GUEST' && <Route path="/*" element={<GuestApp />} />}
      {role && role !== 'ROLE_GUEST' && <Route path="/staff/*" element={<StaffApp role={role} setRole={setRole} />} />}
      
      {/* Якщо немає токена і ми не на сторінці логіну */}
      {!role && (
        <Route path="*" element={
          <div className="p-8 text-center mt-20 text-slate-500 font-medium max-w-sm mx-auto">
            Відскануйте QR-код на столі для замовлення або <br/><br/>
            <button onClick={()=>navigate('/login')} className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg w-full">
              Увійти як персонал
            </button>
          </div>
        } />
      )}
    </Routes>
  );
}
