import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import { getStompClient, onWsConnect } from './ws';
import { BellIcon, CreditCardIcon, CheckCircleIcon, FireIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { ShoppingBagIcon, HeartIcon } from '@heroicons/react/24/solid';

export default function GuestApp() {
    // Беремо гарний номер зі сховища, а не сирий UUID з токена
    const tableNum = localStorage.getItem('guest_table_num') || '?';
    
    return (
        <div className="min-h-screen pb-32 max-w-md mx-auto bg-slate-50 relative shadow-2xl overflow-hidden sm:rounded-[3rem] sm:my-10 sm:border-[8px] sm:border-slate-900">
            <header className="glass sticky top-0 z-30 px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-sm font-semibold tracking-widest text-slate-500 uppercase">Стіл {tableNum}</h1>
                    <div className="text-2xl font-bold tracking-tight text-slate-900">Ваше меню</div>
                </div>
                <CallWaiterButton />
            </header>
            <main className="p-6">
                <GuestFlow />
            </main>
        </div>
    );
}

function CallWaiterButton() {
    const [calling, setCalling] = useState(false);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        api.get('/service-calls/my').then(res => setCalling(res.data.length > 0));
        const client = getStompClient();
        if (!client) return;
        const unsubConnect = onWsConnect(() => {
            client.subscribe('/user/queue/service-calls', (m) => {
                const body = JSON.parse(m.body);
                if (body.type === 'CALL_CREATED') setCalling(true);
                if (body.type === 'CALL_RESOLVED') setCalling(false);
            });
        });
        return () => { unsubConnect(); if (client.connected) client.unsubscribe('/user/queue/service-calls'); };
    }, []);

    const call = () => {
        if (calling) {
            // Скасування виклику
            setCalling(false);
            api.delete('/service-calls/my').catch(() => setCalling(true));
            return;
        }
        
        // Оптимістичний UI: одразу показуємо анімацію та тост
        setCalling(true);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
        
        api.post('/service-calls', { type: 'WAITER' })
           .catch(() => {
               setCalling(false);
               setShowToast(false);
               alert('Помилка при виклику офіціанта');
           });
    };

    return (
        <>
            <button onClick={call} className={`relative p-3 rounded-full transition-all duration-500 shadow-sm ${calling ? 'bg-amber-500 text-white scale-110 shadow-amber-500/40 ring-4 ring-amber-500/20' : 'bg-white text-slate-600 hover:bg-slate-100 hover:scale-105 ring-1 ring-slate-200'}`} title="Покликати офіціанта">
                <BellIcon className={`w-6 h-6 ${calling ? 'animate-wiggle' : ''}`} />
                {calling && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-ping"></span>}
                {calling && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>}
            </button>
            
            {showToast && createPortal(
                <div className="fixed bottom-10 inset-x-0 mx-auto z-[100] flex justify-center px-6 pointer-events-none animate-slideUpFade w-full max-w-md">
                    <div className="bg-emerald-500 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 w-full border border-emerald-400">
                        <CheckCircleIcon className="w-8 h-8 text-emerald-100 shrink-0" />
                        <div>
                            <div className="font-bold text-lg leading-tight">Офіціант вже в дорозі!</div>
                            <div className="text-emerald-50 text-sm font-medium mt-0.5">Будь ласка, зачекайте хвилиночку</div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

function GuestFlow() {
    const [cart, setCart] = useState<Record<number, number>>({});
    const [orders, setOrders] = useState<any[]>([]);

    const fetchOrders = () => api.get('/orders/my').then(res => setOrders(res.data));
    useEffect(() => {
        fetchOrders();
        const client = getStompClient();
        if (!client) return;
        const unsubConnect = onWsConnect(() => client.subscribe('/user/queue/order-updates', () => fetchOrders()));
        return () => { unsubConnect(); if (client.connected) client.unsubscribe('/user/queue/order-updates'); };
    }, []);

    const sendOrder = async () => {
        const payloadItems = Object.entries(cart).map(([id, q]) => ({ menuItemId: parseInt(id), quantity: q }));
        if (!payloadItems.length) return;
        try {
            await api.post('/orders', { items: payloadItems });
            setCart({});
            fetchOrders();
        } catch(e:any) { alert(e.response?.data?.message || 'Помилка замовлення'); }
    };

    const count = Object.values(cart).reduce((a, b) => a + b, 0);

    return (
        <div className="space-y-8 relative">
            {orders.length > 0 && <ActiveOrders orders={orders} />}
            <Menu cart={cart} setCart={setCart} />
            
            {count > 0 && (
                <div className="fixed bottom-6 left-0 right-0 px-6 z-40 max-w-md mx-auto animate-slideUpFade">
                    <button onClick={sendOrder} className="w-full glass-dark text-white p-4 rounded-3xl font-bold flex justify-between items-center hover:scale-[1.02] active:scale-95 transition-transform">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-2xl"><ShoppingBagIcon className="w-6 h-6" /></div>
                            <span className="text-lg">Оформити ({count})</span>
                        </div>
                        <span className="text-xl tracking-tight">В роботу →</span>
                    </button>
                </div>
            )}
        </div>
    );
}

function ActiveOrders({ orders }: { orders: any[] }) {
    const [checkingOut, setCheckingOut] = useState<string | null>(null);

    const pay = async (orderId: string) => {
        try {
            setCheckingOut(orderId);
            const res = await api.post('/payments/checkout', { orderId });
            const form = document.createElement('form');
            form.method = 'POST'; form.action = res.data.checkoutUrl;
            const d = document.createElement('input'); d.type='hidden'; d.name='data'; d.value=res.data.data;
            const s = document.createElement('input'); s.type='hidden'; s.name='signature'; s.value=res.data.signature;
            form.appendChild(d); form.appendChild(s);
            document.body.appendChild(form);
            form.submit();
        } catch (e: any) {
            setCheckingOut(null);
            alert(e.response?.data?.message || 'Помилка оплати');
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <FireIcon className="w-5 h-5 text-amber-500" /> Ваші замовлення
            </h2>
            <div className="space-y-4">
                {orders.map(o => (
                    <div key={o.id} className="p-5 rounded-3xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-4">
                            <span className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl ${o.status === 'NEW' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : o.status === 'PREPARING' ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'}`}>
                                {o.status === 'NEW' ? 'В черзі' : o.status === 'PREPARING' ? 'Готується' : 'Готово'}
                            </span>
                            <span className="text-xl font-bold tracking-tight text-slate-900">{o.total} ₴</span>
                        </div>
                        <div className="text-sm text-slate-500 mb-5 space-y-2">
                            {o.items.map((i: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <span className="flex items-center gap-2"><span className="text-slate-400 font-medium">{i.quantity}×</span> <span className="text-slate-700 font-medium">{i.name}</span></span>
                                    <span>{i.priceAtTime * i.quantity} ₴</span>
                                </div>
                            ))}
                        </div>
                        {!o.paid ? (
                            <button onClick={() => pay(o.id)} disabled={checkingOut === o.id} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-3.5 rounded-2xl font-semibold disabled:opacity-50 hover:bg-slate-800 transition-colors">
                                <CreditCardIcon className="w-5 h-5" />
                                {checkingOut === o.id ? 'Зачекайте...' : 'Сплатити онлайн'}
                            </button>
                        ) : (
                            <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 p-3.5 rounded-2xl font-bold ring-1 ring-emerald-200">
                                <CheckCircleIcon className="w-5 h-5" /> Оплачено
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Menu({ cart, setCart }: { cart: Record<number, number>, setCart: any }) {
    const [items, setItems] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<any>(null); // Для модалки
    const [likedItems, setLikedItems] = useState<Set<number>>(new Set());

    useEffect(() => { 
        api.get('/menu/items').then(res => {
            setItems(res.data);
            const cats = Array.from(new Set(res.data.filter((i:any) => i.isAvailable).map((i:any) => i.categoryName)));
            if (cats.length > 0) setActiveCategory(cats[0] as string);
        }); 
        
        // Завантажуємо локальні лайки
        try {
            const saved = localStorage.getItem('liked_items');
            if (saved) setLikedItems(new Set(JSON.parse(saved)));
        } catch(e) {}
    }, []);

    const add = (id: number) => setCart((c: any) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    const sub = (id: number) => setCart((c: any) => { const nc = { ...c, [id]: c[id] - 1 }; if (nc[id] <= 0) delete nc[id]; return nc; });

    const handleLike = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        const isLiked = likedItems.has(id);
        
        if (isLiked) {
            api.delete(`/menu/items/${id}/like`).catch(()=>{});
            const newSet = new Set(likedItems);
            newSet.delete(id);
            setLikedItems(newSet);
            localStorage.setItem('liked_items', JSON.stringify(Array.from(newSet)));
            setItems(prev => prev.map(i => i.id === id ? {...i, favoritesCount: Math.max(0, (i.favoritesCount || 0) - 1)} : i));
        } else {
            api.post(`/menu/items/${id}/like`).catch(()=>{});
            const newSet = new Set(likedItems);
            newSet.add(id);
            setLikedItems(newSet);
            localStorage.setItem('liked_items', JSON.stringify(Array.from(newSet)));
            setItems(prev => prev.map(i => i.id === id ? {...i, favoritesCount: (i.favoritesCount || 0) + 1} : i));
        }
    };

    const categories = Array.from(new Set(items.filter(i => i.isAvailable).map(i => i.categoryName)));
    const currentItems = items.filter(i => i.isAvailable && i.categoryName === activeCategory);

    return (
        <div className="space-y-6">
            {/* Горизонтальний список категорій */}
            <div className="flex gap-3 overflow-x-auto pb-4 pt-2 -mx-6 px-6 scroll-pl-6 no-scrollbar snap-x after:content-[''] after:w-1 after:shrink-0">
                {categories.map((cat: any) => (
                    <button 
                        key={cat} 
                        onClick={() => setActiveCategory(cat)}
                        className={`snap-start whitespace-nowrap px-5 py-2.5 rounded-full font-bold transition-all ${activeCategory === cat ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Модалка з інформацією про продукт */}
            {selectedItem && createPortal(
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-0 animate-slideUpFade" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white w-full sm:max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        {selectedItem.imageUrl && <img src={selectedItem.imageUrl} className="w-full aspect-[4/3] object-cover" />}
                        <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md">✕</button>
                        
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-2">
                                <h2 className="text-2xl font-bold text-slate-900 leading-tight pr-4">{selectedItem.name}</h2>
                                <span className="text-xl font-bold whitespace-nowrap">{selectedItem.price} ₴</span>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-6 text-sm font-medium text-pink-500 bg-pink-50 w-fit px-3 py-1 rounded-full">
                                <HeartIcon className="w-4 h-4" /> 
                                {(selectedItem.favoritesCount || 0)} людям подобається
                            </div>

                            {selectedItem.ingredients && (
                                <div className="mb-4">
                                    <h3 className="font-bold text-slate-900 mb-1">Склад:</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{selectedItem.ingredients}</p>
                                </div>
                            )}

                            {selectedItem.allergens && (
                                <div className="mb-6 bg-amber-50 p-3 rounded-2xl border border-amber-100">
                                    <h3 className="font-bold text-amber-900 mb-1 text-sm">Алергени:</h3>
                                    <p className="text-amber-700 text-sm">{selectedItem.allergens}</p>
                                </div>
                            )}

                            {!selectedItem.ingredients && !selectedItem.allergens && (
                                <p className="text-slate-500 mb-6 italic">Детальна інформація відсутня</p>
                            )}

                            <button onClick={() => { add(selectedItem.id); setSelectedItem(null); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-colors">
                                Додати за {selectedItem.price} ₴
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Сітка товарів */}
            <div className="grid grid-cols-2 gap-4">
                {currentItems.map((i:any) => (
                    <div key={i.id} className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg transition-all group relative">
                        {/* Кнопка лайку */}
                        <button 
                            onClick={(e) => handleLike(e, i.id)} 
                            className="absolute top-2 right-2 z-10 h-8 px-2.5 bg-white/90 backdrop-blur-md rounded-full flex items-center gap-1.5 shadow-sm text-xs font-bold text-slate-600 transition-transform active:scale-90"
                        >
                            {likedItems.has(i.id) ? <HeartIcon className="w-4 h-4 text-pink-500" /> : <HeartIconOutline className="w-4 h-4 text-slate-400" />}
                            <span className={likedItems.has(i.id) ? "text-pink-600" : "text-slate-500"}>{i.favoritesCount || 0}</span>
                        </button>
                        
                        <div className="w-full aspect-[4/3] overflow-hidden bg-slate-100 relative" onClick={() => setSelectedItem(i)}>
                            {i.imageUrl ? 
                                <img src={i.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" />
                                : <div className="w-full h-full cursor-pointer"></div>
                            }
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
                            <button className="absolute bottom-2 left-2 w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center pointer-events-none">
                                <InformationCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-semibold text-slate-900 leading-tight mb-1 text-sm" onClick={() => setSelectedItem(i)}>{i.name}</h3>
                            <p className="text-slate-500 font-medium mb-4 flex-1 text-sm">{i.price} ₴</p>
                            
                            {cart[i.id] ? (
                                <div className="flex justify-between items-center bg-slate-100 rounded-2xl p-1 shadow-inner h-11">
                                    <button onClick={() => sub(i.id)} className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm font-medium text-xl text-slate-600 active:scale-95 transition-all">−</button>
                                    <span className="font-bold text-slate-900 text-center">{cart[i.id]}</span>
                                    <button onClick={() => add(i.id)} className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm font-medium text-xl text-slate-600 active:scale-95 transition-all">+</button>
                                </div>
                            ) : (
                                <button onClick={() => add(i.id)} className="w-full bg-slate-50 font-bold text-slate-700 h-11 rounded-2xl text-sm active:scale-95 transition-all ring-1 ring-slate-200 hover:bg-slate-100">
                                    Додати
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
