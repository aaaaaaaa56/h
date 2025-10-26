const {Client} = require('discord.js-selfbot-v13');
const {joinVoiceChannel} = require('@discordjs/voice');
const express = require('express');

const Care = new Client({
    checkUpdate: false,
    ws: { 
        properties: {
            browser: 'Discord Client',
            os: 'Windows'
        }
    }
});

const careStore = require('./careStore');

// Express Server - حطه هنا قبل Care.login()
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running! 🤖');
});

app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        user: Care.user?.tag || 'Not logged in',
        uptime: process.uptime()
    });
});

app.listen(PORT, () => {
    console.log(`Keep-alive server running on port ${PORT}`);
});

// Discord Bot Events
Care.on('ready', async () => {
    console.log('Logged in as ' + Care.user.tag + '!');
    console.log('All Right Receive To : \nCare Store\nhttps://discord.gg/TEghZPgRmF');
    console.log('Join our Discord store for more: https://discord.gg/TEghZPgRmF');
    
    setTimeout(async () => {
        await joinVC(Care, careStore);
    }, 3000);
});

Care.on('voiceStateUpdate', async (oldState, newState) => {
    const oldChannel = oldState.channelId;
    const newChannel = newState.channelId;
    
    if (oldChannel !== newChannel) {
        if (!newChannel) {
            if (oldState.member.id !== Care.user.id) return;
            await joinVC(Care, careStore);
        } else {
            if (oldState.member.id !== Care.user.id) return;
            if (newChannel !== careStore.Channel) {
                await joinVC(Care, careStore);
            }
        }
    }
});

Care.login(careStore.Token).catch(err => {
    console.error('Login failed:', err);
});

async function joinVC(client, config) {
    try {
        const guild = client.guilds.cache.get(config.Guild);
        if (!guild) {
            console.error('Guild not found!');
            return;
        }
        
        const channel = guild.channels.cache.get(config.Channel);
        if (!channel) {
            console.error('Voice channel not found!');
            return;
        }
        
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: config.selfDeaf,
            selfMute: config.selfMute
        });
        
        console.log('Joined voice channel: ' + channel.name + ' in guild: ' + guild.name);
    } catch (error) {
        console.error('Error joining VC:', error);
    }
}
