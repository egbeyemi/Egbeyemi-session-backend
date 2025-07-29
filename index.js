const { default: makeWASocket, useMultiFileAuthState, makeWALegacySocket, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/qr', async (req, res) => {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            res.setHeader('Content-Type', 'text/plain');
            res.end(`Scan this QR:\n\n${qr}`);
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) sock = startSock();
        }

        if (connection === 'open') {
            console.log('✅ Connected');
        }
    });

    sock.ev.on('creds.update', saveCreds);
});

app.get('/pair', async (req, res) => {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ['Egbeyemi-Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, pairingCode } = update;

        if (pairingCode) {
            res.setHeader('Content-Type', 'text/plain');
            res.end(`🔗 Pairing Code:\n\n${pairingCode}`);
        }

        if (connection === 'open') {
            console.log('✅ Connected with Pairing Code');
        }
    });

    sock.ev.on('creds.update', saveCreds);
});

app.get('/', (req, res) => {
    res.send('👋 Welcome to Egbeyemi WhatsApp Session Generator! Use /qr or /pair');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
