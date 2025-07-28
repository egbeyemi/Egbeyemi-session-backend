const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } = require("@whiskeysockets/baileys");
const express = require("express");
const pino = require("pino");
const app = express();
const PORT = process.env.PORT || 3000;

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
store.readFromFile('./baileys_store_multi.json');
setInterval(() => {
    store.writeToFile('./baileys_store_multi.json');
}, 10_000);

const connectToWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ['Egbeyemi-Bot', 'Safari', '1.0.0'],
        getMessage: async (key) => ({
            conversation: 'Egbeyemi MD Bot'
        })
    });

    store.bind(sock.ev);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
        if (connection === "open") {
            console.log("✅ Bot connected successfully!");
        } else if (connection === "close") {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("❌ Disconnected. Reconnecting...", shouldReconnect);
            if (shouldReconnect) connectToWhatsApp();
        }

        if (qr) {
            global._qr = qr;
        }
    });

    return sock;
};

let sock;
connectToWhatsApp().then((s) => (sock = s));

app.get("/", (req, res) => {
    res.send(`<h2>💡 Session Generator is Running</h2><p>Use <code>/qr</code> or <code>/pair</code> to generate your session.</p>`);
});

app.get("/qr", (req, res) => {
    if (global._qr) {
        res.send(`<h3>📱 Scan this QR Code in WhatsApp</h3><img src="https://api.qrserver.com/v1/create-qr-code/?data=${global._qr}&size=300x300" alt="qr"/>`);
    } else {
        res.send("⚠️ QR code not ready. Please wait...");
    }
});

app.get("/pair", (req, res) => {
    if (!sock) return res.send("⚠️ Bot not connected yet.");
    const code = sock?.ev?.emit?.("request-pairing-code", { phoneNumber: req.query?.number || '' });
    res.send("🔗 Pairing code requested. Check your terminal.");
});

app.listen(PORT, () => {
    console.log("🟢 Server is running on port " + PORT);
});
