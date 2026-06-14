const express = require('express')
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const QRCode = require('qrcode')

const app = express()
let lastQR = ''

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({ auth: state, printQRInTerminal: true })

    sock.ev.on('connection.update', ({ qr, connection }) => {
        if (qr) lastQR = qr
        if (connection === 'open') console.log('✅ BOT CONNECTED!')
    })
    sock.ev.on('creds.update', saveCreds)
}

// Website route - shows QR as image
app.get('/', async (req, res) => {
    if (!lastQR) return res.send('<h1>Waiting for QR... Refresh page</h1>')
    const qrImage = await QRCode.toDataURL(lastQR)
    res.send(`<img src="${qrImage}" style="width:400px"><br><h2>Scan with WhatsApp</h2>`)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`QR Website running on port ${PORT}`))
startBot()
