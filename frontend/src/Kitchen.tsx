import React, { useEffect, useState } from 'react';
import { api } from './api';
import { getStompClient } from './ws';

export default function Kitchen() {
    const [orders, setOrders] = useState<any[]>([]);

    const fetchActive = () => api.get('/orders/active').then(res => setOrders(res.data));

    useEffect(() => {
        fetchActive();
        const client = getStompClient();
        if (!client) return;
        client.onConnect = () => {
            client.subscribe('/topic/kitchen', (m) => {
                fetchActive();
            });
        };
        return () => { if (client.connected) client.unsubscribe('/topic/kitchen'); };
    }, []);

    const updateStatus = async (id: string, target: string) => {
        try {
            await api.patch(`/orders/${id}/status`, { status: target });
            fetchActive();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Помилка зміни статусу');
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Дошка кухні / Офіціанта</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Стовпець 1: NEW */}
                <div className="bg-gray-100 p-4 rounded-xl min-h-screen">
                    <h2 className="font-bold mb-4 bg-blue-200 text-blue-800 p-2 rounded-lg text-center">
                        НОВІ ({orders.filter(o => o.status === 'NEW').length})
                    </h2>
                    <div className="space-y-4">
                        {orders.filter(o => o.status === 'NEW').map(o => (
                            <OrderCard key={o.id} order={o} onNext={() => updateStatus(o.id, 'PREPARING')} btnText="Взяти в роботу" />
                        ))}
                    </div>
                </div>

                {/* Стовпець 2: PREPARING */}
                <div className="bg-gray-100 p-4 rounded-xl min-h-screen">
                    <h2 className="font-bold mb-4 bg-orange-200 text-orange-800 p-2 rounded-lg text-center">
                        ГОТУЮТЬСЯ ({orders.filter(o => o.status === 'PREPARING').length})
                    </h2>
                    <div className="space-y-4">
                        {orders.filter(o => o.status === 'PREPARING').map(o => (
                            <OrderCard key={o.id} order={o} onNext={() => updateStatus(o.id, 'READY')} btnText="Готово до видачі" />
                        ))}
                    </div>
                </div>

                {/* Стовпець 3: READY */}
                <div className="bg-gray-100 p-4 rounded-xl min-h-screen">
                    <h2 className="font-bold mb-4 bg-green-200 text-green-800 p-2 rounded-lg text-center">
                        ОЧІКУЮТЬ ВИДАЧІ ({orders.filter(o => o.status === 'READY').length})
                    </h2>
                    <div className="space-y-4">
                        {orders.filter(o => o.status === 'READY').map(o => (
                            <OrderCard key={o.id} order={o} onNext={() => updateStatus(o.id, 'PAID')} btnText="Видано і Оплачено" />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

function OrderCard({ order, onNext, btnText }: { order: any, onNext: () => void, btnText: string }) {
    const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-3 border-b pb-2">
                <div>
                    <span className="font-bold text-lg">Стіл {order.tableNumber}</span>
                    <span className="text-gray-400 text-sm ml-2">{time}</span>
                </div>
                {order.paid && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">ОПЛАЧЕНО</span>}
            </div>
            <ul className="mb-4 space-y-1">
                {order.items.map((i: any, idx: number) => (
                    <li key={idx} className="flex justify-between font-medium">
                        <span>{i.quantity}x {i.name}</span>
                    </li>
                ))}
            </ul>
            <button onClick={onNext} className="w-full bg-black text-white py-2 rounded-lg font-bold text-sm hover:bg-gray-800">
                {btnText}
            </button>
        </div>
    );
}
