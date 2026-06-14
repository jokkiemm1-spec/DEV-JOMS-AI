const fs = require('fs')
const path = require('path')

// DELETE OLD SESSION - Force fresh QR
const authFolder = 'auth_info_baileys'
if (fs.existsSync(authFolder)) {
    fs.rmSync(authFolder, { recursive: true, force: true })
    console.log('Deleted old session - Generating fresh QR')
}

const express = require('express')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const QRCode = require('qrcode')

const app = express()
let lastQR = ''
let botStatus = 'Starting...'

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We use website now
        browser: Browsers.macOS('Desktop'),
        qrTimeout: 60000
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            lastQR = qr
            botStatus = 'Scan QR Code'
            console.log('New QR generated - Check website')
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut
            console.log('Connection closed:', shouldReconnect)
            if (shouldReconnect) {
                botStatus = 'Reconnecting...'
                startBot()
            } else {
                botStatus = 'Logged out'
            }
        } else if (connection === 'open') {
            botStatus = 'Connected'
            lastQR = ''
            console.log('✅ DEV JOMS AI BOT CONNECTED!')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    // Bot commands
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

        if (text === '.ping') {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Dev Joms AI Bot dey live ⚡ No dull am!' })
        }
    })
}

// Website to show QR
app.get('/', async (req, res) => {
    if (botStatus === 'Connected') {
        return res.send(`
            <html>
            <body style="font-family:sans-serif;text-align:center;padding:50px;background:#25D366;color:white;">
                <h1>✅ DEV JOMS AI BOT</h1>
                <h2>Status: Connected & Online</h2>
                <p>Bot is running 24/7. No need to scan again.</p>
            </body>
            </html>
        `)
    }

    if (!lastQR) {
        return res.send(`
            <html>
            <body style="font-family:sans-serif;text-align:center;padding:50px;">
                <h1>⏳ Waiting for QR Code...</h1>
                <p>Status: ${botStatus}</p>
                <p>Refresh this page in 10 seconds</p>
                <script>setTimeout(() => location.reload(), 5000)</script>
            </body>
            </html>
        `)
    }

    try {
        const qrImage = await QRCode.toDataURL(lastQR, { width: 400 })
        res.send(`
            <html>
            <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="font-family:sans-serif;text-align:center;padding:20px;">
                <h1>DEV JOMS AI BOT</h1>
                <h2>Scan QR with WhatsApp</h2>
                <img src="${qrImage}" style="width:90%;max-width:400px;border:2px solid #25D366;">
                <p><b>Steps:</b></p>
                <p>1. Open WhatsApp → Linked devices → Link a device</p>
                <p>2. Scan this QR code</p>
                <p>3. Status: ${botStatus}</p>
                <p style="color:red;">QR refreshes every 60 seconds</p>
                <script>setTimeout(() => location.reload(), 55000)</script>
            </body>
            </html>
        `)
    } catch (err) {
        res.send('<h1>Error generating QR. Refresh page.</h1>')
    }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`QR Website running on port ${PORT}`))
startBot()
