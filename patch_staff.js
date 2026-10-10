const fs = require('fs');
let code = fs.readFileSync('frontend/src/StaffApp.tsx', 'utf-8');

const importRegex = /import \{ (.*?) \} from 'react';/;
code = code.replace(importRegex, "import React, { useEffect, useState } from 'react';\nimport { api } from './api';\nimport { getStompClient } from './ws';");

const appRegex = /export default function StaffApp.*?\{/;
const newApp = `export default function StaffApp({ role, setRole }: { role: string, setRole: any }) {
    const [newOrders, setNewOrders] = useState(0);
    const [openCalls, setOpenCalls] = useState(0);

    useEffect(() => {
        // Initial load
        api.get('/orders/active').then(res => {
            setNewOrders(res.data.filter((o:any) => o.status === 'NEW').length);
        }).catch(()=>{});
        
        api.get('/service-calls/active').then(res => {
            setOpenCalls(res.data.length);
        }).catch(()=>{});

        // WebSockets
        const client = getStompClient();
        if (!client) return;
        const sub = client.onConnect = () => {
            client.subscribe('/topic/orders', () => {
                // To keep it simple and accurate, just re-fetch on any change
                api.get('/orders/active').then(res => {
                    setNewOrders(res.data.filter((o:any) => o.status === 'NEW').length);
                });
            });
            client.subscribe('/topic/service-calls', () => {
                api.get('/service-calls/active').then(res => {
                    setOpenCalls(res.data.length);
                });
            });
        };
        return () => {
            if (client.connected) {
                client.unsubscribe('/topic/orders');
                client.unsubscribe('/topic/service-calls');
            }
        };
    }, []);
`;
code = code.replace(appRegex, newApp);

const oldLinkItem = `    const LinkItem = ({ to, icon, label }: any) => {
        const active = location.pathname.startsWith(to);
        return (
            <Link to={to} className={\`flex items-center gap-3 p-3 rounded-xl transition-colors font-medium \${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}\`}>
                {icon} {label}
            </Link>
        );
    };`;

const newLinkItem = `    const LinkItem = ({ to, icon, label, badge = 0, badgeColor = 'bg-red-500' }: any) => {
        const active = location.pathname.startsWith(to);
        return (
            <Link to={to} className={\`flex items-center justify-between p-3 rounded-xl transition-colors font-medium \${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}\`}>
                <div className="flex items-center gap-3">
                    {icon} {label}
                </div>
                {badge > 0 && (
                    <span className={\`\${badgeColor} text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse\`}>
                        {badge}
                    </span>
                )}
            </Link>
        );
    };`;
code = code.replace(oldLinkItem, newLinkItem);

code = code.replace(
    'label="Дошка замовлень" />',
    'label="Дошка замовлень" badge={newOrders} badgeColor="bg-blue-500" />'
);

code = code.replace(
    'label="Виклики столів" />',
    'label="Виклики столів" badge={openCalls} badgeColor="bg-amber-500" />'
);

fs.writeFileSync('frontend/src/StaffApp.tsx', code);
