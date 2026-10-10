import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { PhotoIcon } from '@heroicons/react/24/outline';

export default function AdminMenu() {
    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [newCat, setNewCat] = useState('');
    const [newItem, setNewItem] = useState({ name: '', price: '', categoryId: '', ingredients: '', allergens: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const load = () => {
        api.get('/menu/categories').then(res => setCategories(res.data));
        api.get('/menu/items').then(res => setItems(res.data));
    };
    useEffect(() => { load(); }, []);

    const addCat = async () => {
        if(!newCat) return;
        await api.post('/menu/categories', { name: newCat });
        setNewCat('');
        load();
    };

    const addItem = async () => {
        if(!newItem.name || !newItem.price || !newItem.categoryId) return;
        try {
            // Спочатку створюємо страву (без картинки)
            const res = await api.post('/menu/items', { 
                name: newItem.name, 
                price: parseFloat(newItem.price), 
                categoryId: parseInt(newItem.categoryId) 
            });
            
            // Якщо було вибрано файл, завантажуємо його
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                await api.post(`/menu/items/${res.data.id}/image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            setNewItem({ name: '', price: '', categoryId: '', ingredients: '', allergens: '' });
            setSelectedFile(null);
            if(fileInputRef.current) fileInputRef.current.value = '';
            load();
        } catch(e:any) { alert(e.response?.data?.message || 'Помилка'); }
    };

    const toggleAvail = async (id: number, avail: boolean) => {
        await api.patch(`/menu/items/${id}/availability`, { isAvailable: !avail });
        load();
    };

    const uploadImageForItem = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        try {
            const formData = new FormData();
            formData.append('file', e.target.files[0]);
            await api.post(`/menu/items/${id}/image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            load();
        } catch(err:any) { alert(err.response?.data?.message || 'Помилка завантаження'); }
    };

    return (
        <div className="p-8 max-w-6xl">
            <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Редактор меню</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Categories */}
                <div className="col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit">
                    <h2 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Категорії</h2>
                    <div className="flex gap-2 mb-6">
                        <input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg flex-1" value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Нова категорія"/>
                        <button onClick={addCat} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700">Додати</button>
                    </div>
                    <ul className="space-y-2">
                        {categories.map((c:any) => <li key={c.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 font-medium text-slate-900 dark:text-slate-200">{c.name}</li>)}
                    </ul>
                </div>
                {/* Items */}
                <div className="col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Нова страва</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                        <input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg col-span-2" value={newItem.name} onChange={e=>setNewItem({...newItem, name:e.target.value})} placeholder="Назва страви"/>
                        <input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg col-span-2 text-sm" value={newItem.ingredients} onChange={e=>setNewItem({...newItem, ingredients:e.target.value})} placeholder="Склад (інгредієнти)"/>
                        <input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg col-span-2 text-sm" value={newItem.allergens} onChange={e=>setNewItem({...newItem, allergens:e.target.value})} placeholder="Алергени"/>
                        <input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg" type="number" step="0.01" value={newItem.price} onChange={e=>setNewItem({...newItem, price:e.target.value})} placeholder="Ціна (₴)"/>
                        <select className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg" value={newItem.categoryId} onChange={e=>setNewItem({...newItem, categoryId:e.target.value})}>
                            <option value="">Оберіть категорію...</option>
                            {categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="col-span-2 flex items-center gap-3">
                            <input type="file" accept="image/png, image/jpeg, image/jpg" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-500/20 dark:file:text-indigo-400 dark:hover:file:bg-indigo-500/30" />
                        </div>
                        <button onClick={addItem} className="bg-indigo-600 text-white px-4 py-3 rounded-lg col-span-2 font-bold hover:bg-indigo-700">Створити страву</button>
                    </div>

                    <h2 className="font-bold text-lg mb-4 text-slate-900 dark:text-white mt-8">Меню закладу</h2>
                    <div className="space-y-3">
                        {items.map((i:any) => (
                            <div key={i.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex gap-4 items-center">
                                    <div className="relative group">
                                        {i.imageUrl ? 
                                            <img src={i.imageUrl} className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-600 shadow-sm" /> 
                                            : <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600"><PhotoIcon className="w-6 h-6 text-slate-400"/></div>
                                        }
                                        {/* Невидимий інпут поверх картинки для завантаження нового фото */}
                                        <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={(e) => uploadImageForItem(i.id, e)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Натисніть щоб змінити фото" />
                                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <PhotoIcon className="w-6 h-6 text-white"/>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg text-slate-900 dark:text-white">{i.name} <span className="text-slate-500 dark:text-slate-400 font-normal ml-2">{i.price} ₴</span></div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium bg-slate-200 dark:bg-slate-700 w-fit px-2 py-0.5 rounded mt-1">{i.categoryName}</div>
                                    </div>
                                </div>
                                <button onClick={() => toggleAvail(i.id, i.isAvailable)} className={`px-4 py-2 rounded-lg font-bold text-sm ${i.isAvailable ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30':'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30'} transition-colors`}>
                                    {i.isAvailable ? 'В наявності' : 'В стоп-листі'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
