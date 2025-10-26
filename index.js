const {Client} = require('discord.js-selfbot-v13');
const {joinVoiceChannel} = require('@discordjs/voice');
const Care = new Client({'checkUpdate': false});
const careStore = require('./careStore');

Care.on('ready', async () => {
    console.log('Logged in as ' + Care.user.tag + '!');
    console.log('All Right Receive To : \nCare Store\nhttps://discord.gg/TEghZPgRmF');
    console.log('Join our Discord store for more: https://discord.gg/TEghZPgRmF');
    await joinVC(Care, careStore);
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

Care.login(careStore.Token);

async function joinVC(client, config) {
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
}