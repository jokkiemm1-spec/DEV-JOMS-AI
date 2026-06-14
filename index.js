const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const axios = require('axios')
const pino = require('pino')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: true
    })

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            console.log('=== SCAN THIS QR CODE ===')
            qrcode.generate(qr, { small: true })
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log('✅ DEV JOMS AI BOT CONNECTED!')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const text = m.message.conversation || m.message.extendedTextMessage?.text || ''
        const sender = m.key.remoteJid
        if (!text.startsWith('.')) return
        const command = text.slice(1).split(' ')[0].toLowerCase()

        if (command === 'ping') {
            await sock.sendMessage(sender, { text: 'Dev Joms AI Bot dey live ⚡ No dull am!' })
        }

        if (command === 'roast') {
            try {
                await sock.sendMessage(sender, { text: 'Dev Joms AI dey cook am... 🔥' })
                let mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
                let who = mentioned[0] || (m.key.participant || sender)
                let name = who.split('@')[0]
                if (who === (m.key.participant || sender)) name = "you"

                const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'user', content: `Roast ${name} in Nigerian pidgin. 1-2 sentences, savage, funny, no curse words.` }],
                    max_tokens: 60
                }, {
                    headers: { 'Authorization': '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' }
                })
                await sock.sendMessage(sender, { text: data.choices[0].message.content })
            } catch (e) {
                await sock.sendMessage(sender, { text: 'Roast machine hang. Try again' })
            }
        }
    })
}

startBot()
