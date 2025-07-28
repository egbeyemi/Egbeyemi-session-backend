const express = require('express');
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

let sock;

async function startBot() {
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, pairingCode } = update;

        if (qr) {
            fs.writeFileSync('./qr.txt', qr);
            console.log('QR Code available');
        }

        if (pairingCode) {
            fs.writeFileSync('./pair.txt', pairingCode);
            console.log('Pairing Code available:', pairingCode);
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting: ', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot connected successfully!');
        }
    });
}

startBot();

app.get('/', (req, res) => {
    res.send('🚀 Egbeyemi-MD Session Server Running');
});

app.get('/qr', (req, res) => {
    if (fs.existsSync('./qr.txt')) {
        const qr = fs.readFileSync('./qr.txt', 'utf-8');
        res.send(`<h2>Scan with WhatsApp:</h2><img src="https://api.qrserver.com/v1/create-qr-code/?data=${qr}&size=250x250" />`);
    } else {
        res.send('⏳ Waiting for QR...');
    }
});

app.get('/pair', (req, res) => {
    if (fs.existsSync('./pair.txt')) {
        const pair = fs.readFileSync('./pair.txt', 'utf-8');
        res.send(`<h2>Pairing Code:</h2><p style="font-size: 24px;">${pair}</p>`);
    } else {
        res.send('⏳ Waiting for Pairing Code...');
    }
});

app.listen(port, () => {
    console.log(`🌐 Server running at http://localhost:${port}`);
});
