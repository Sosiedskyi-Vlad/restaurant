import { Client } from '@stomp/stompjs';

let client: Client | null = null;
let currentToken: string | null = null;
let connectCallbacks: Array<() => void> = [];

export const getStompClient = () => {
    const isStaff = window.location.pathname.startsWith('/staff');
    const token = localStorage.getItem(isStaff ? 'staff_token' : 'guest_token');
    if (!token) return null;

    if (client && client.active && currentToken === token) {
        return client;
    }

    if (client) {
        client.deactivate();
        client = null;
    }

    currentToken = token;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    client = new Client({
        brokerURL: `${protocol}//${window.location.host}/ws/orders`,
        connectHeaders: {
            Authorization: `Bearer ${token}`
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
    });
    
    client.onConnect = () => {
        connectCallbacks.forEach(cb => cb());
    };
    
    client.activate();
    return client;
};

export const onWsConnect = (cb: () => void) => {
    if (client && client.connected) {
        cb();
    }
    connectCallbacks.push(cb);
    return () => {
        connectCallbacks = connectCallbacks.filter(c => c !== cb);
    };
};

export const disconnectWs = () => {
    if (client) {
        client.deactivate();
        client = null;
        currentToken = null;
        connectCallbacks = [];
    }
};
