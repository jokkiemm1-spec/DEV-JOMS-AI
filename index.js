const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // No more QR stress
        browser: ['Dev Joms AI Bot', 'Chrome', '1.0.0']
    })

    // PAIRING CODE FOR YOUR NUMBER
    if (!sock.authState.creds.registered) {
        const phoneNumber = '2349036106257' // Your number
        setTimeout(async () => {
            const code = await sock.requestPairingCode(phoneNumber)
            console.log(`\n\n=== PAIRING CODE FOR DEV JOMS AI BOT ===`)
            console.log(`CODE: ${code}`)
            console.log(`Enter this in WhatsApp > Linked devices > Link with phone number`)
            console.log(`========================================\n\n`)
        }, 3000)
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut
            console.log('Connection closed, reconnecting:', shouldReconnect)
            if(shouldReconnect) startBot()
        } else if(connection === 'open') {
            console.log('✅ DEV JOMS AI BOT CONNECTED!')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    // Your bot commands here
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

        if (text === '.ping') {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Dev Joms AI Bot dey live ⚡ No dull am!' })
        }

        if (text.startsWith('.roast')) {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Your face be like free WiFi - everybody don connect before 😂' })
        }
    })
}

startBot()
