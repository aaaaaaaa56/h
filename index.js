const {Client} = require('discord.js-selfbot-v13');
const {joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus} = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');

const Care = new Client({
    checkUpdate: false,
    captchaService: 'custom',
    captchaWithProxy: false,
    captchaSolver: function (captcha, userAgent) {
        console.log('Captcha detected');
        return;
    },
    ws: { 
        properties: {
            browser: 'Discord Client',
            os: 'Windows'
        }
    },
    // إضافة هذه الإعدادات المهمة
    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

const careStore = require('./careStore');

// Express Server
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running');
});

app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        user: Care.user?.tag || 'Not logged in',
        uptime: process.uptime(),
        playing: currentSong || 'Nothing',
        queue: queue.length
    });
});

app.listen(PORT, () => {
    console.log(`Keep-alive server running on port ${PORT}`);
});

let connection = null;
let player = null;
let currentSong = null;
let queue = [];
let volume = 1.0;
let isLooping = false;
let favorites = [];

Care.on('ready', async () => {
    console.log('Logged in as ' + Care.user.tag);
    console.log('All Right Receive To : Care Store');
    console.log('https://discord.gg/TEghZPgRmF');
    console.log('===============================');
    console.log('Commands:');
    console.log('ش [song name] - Play a song');
    console.log('ايقاف - Stop playback');
    console.log('تخطي - Skip current song');
    console.log('صوت [0-200] - Change volume level');
    console.log('قائمة - Show queue');
    console.log('تكرار - Toggle loop');
    console.log('معلومات - Current song info');
    console.log('حفظ - Save to favorites');
    console.log('مفضلة - Show favorites');
    console.log('مسح - Clear queue');
    console.log('===============================');
    
    setTimeout(async () => {
        await joinVC(Care, careStore);
    }, 3000);
});

// تغيير من messageCreate إلى message
Care.on('message', async (message) => {
    // تأكد إن الرسالة منك
    if (message.author.id !== Care.user.id) return;
    
    // تجاهل الرسائل من البوتات
    if (message.author.bot) return;
    
    const content = message.content.trim();
    const args = content.split(' ');
    const command = args[0];
    
    console.log('Received command: ' + content); // للتأكد من استلام الرسالة
    
    // تشغيل اغنية
    if (command === 'ش') {
        const query = args.slice(1).join(' ');
        
        if (!query) {
            message.reply('Enter song name or YouTube URL');
            return;
        }
        
        queue.push(query);
        
        if (!currentSong) {
            message.reply('Now playing: ' + query);
            await playNext(message);
        } else {
            message.reply('Added to queue - Position: ' + queue.length);
        }
        return;
    }
    
    // ايقاف
    if (command === 'ايقاف' || command === 'stop') {
        if (player) {
            player.stop();
            currentSong = null;
            queue = [];
            message.reply('Playback stopped and queue cleared');
        } else {
            message.reply('No song is currently playing');
        }
        return;
    }
    
    // تخطي
    if (command === 'تخطي' || command === 'skip') {
        if (player && currentSong) {
            const skipped = currentSong;
            if (queue.length > 0) {
                message.reply('Skipped: ' + skipped);
                await playNext(message);
            } else {
                player.stop();
                currentSong = null;
                message.reply('Skipped: ' + skipped + ' - Queue is empty');
            }
        } else {
            message.reply('No song is currently playing');
        }
        return;
    }
    
    // التحكم بالصوت
    if (command === 'صوت' || command === 'volume') {
        const vol = parseInt(args[1]);
        
        if (isNaN(vol) || vol < 0 || vol > 200) {
            message.reply('Enter a number between 0 and 200');
            return;
        }
        
        volume = vol / 100;
        
        if (player && player.state.resource) {
            player.state.resource.volume?.setVolume(volume);
        }
        
        message.reply('Volume set to: ' + vol + '%');
        return;
    }
    
    // عرض القائمة
    if (command === 'قائمة' || command === 'queue') {
        if (queue.length === 0 && !currentSong) {
            message.reply('Queue is empty');
            return;
        }
        
        let queueText = '**Playback Queue:**\n\n';
        
        if (currentSong) {
            queueText += `**Now Playing:** ${currentSong}\n\n`;
        }
        
        if (queue.length > 0) {
            queueText += '**Up Next:**\n';
            queue.forEach((song, index) => {
                queueText += `${index + 1}. ${song}\n`;
            });
        }
        
        message.reply(queueText);
        return;
    }
    
    // تكرار
    if (command === 'تكرار' || command === 'loop') {
        isLooping = !isLooping;
        message.reply(isLooping ? 'Loop enabled' : 'Loop disabled');
        return;
    }
    
    // معلومات الاغنية
    if (command === 'معلومات' || command === 'info') {
        if (!currentSong) {
            message.reply('No song is currently playing');
            return;
        }
        
        message.reply('**Current Song:**\n' + currentSong + '\n\n' +
                     '**Volume:** ' + (volume * 100) + '%\n' +
                     '**Loop:** ' + (isLooping ? 'Enabled' : 'Disabled') + '\n' +
                     '**In Queue:** ' + queue.length + ' songs');
        return;
    }
    
    // حفظ في المفضلة
    if (command === 'حفظ' || command === 'save') {
        if (!currentSong) {
            message.reply('No song is currently playing');
            return;
        }
        
        if (!favorites.includes(currentSong)) {
            favorites.push(currentSong);
            message.reply('Song saved to favorites');
        } else {
            message.reply('Song already in favorites');
        }
        return;
    }
    
    // عرض المفضلة
    if (command === 'مفضلة' || command === 'favorites') {
        if (favorites.length === 0) {
            message.reply('No saved songs');
            return;
        }
        
        let favText = '**Favorite Songs:**\n\n';
        favorites.forEach((song, index) => {
            favText += `${index + 1}. ${song}\n`;
        });
        
        message.reply(favText);
        return;
    }
    
    // مسح القائمة
    if (command === 'مسح' || command === 'clear') {
        queue = [];
        message.reply('Queue cleared');
        return;
    }
    
    // وقف مؤقت
    if (command === 'وقف' || command === 'pause') {
        if (player) {
            player.pause();
            message.reply('Playback paused');
        }
        return;
    }
    
    // استئناف
    if (command === 'استئناف' || command === 'resume') {
        if (player) {
            player.unpause();
            message.reply('Playback resumed');
        }
        return;
    }
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
            console.error('Guild not found');
            return;
        }
        
        const channel = guild.channels.cache.get(config.Channel);
        if (!channel) {
            console.error('Voice channel not found');
            return;
        }
        
        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: config.selfDeaf,
            selfMute: false
        });
        
        console.log('Joined voice channel: ' + channel.name);
        
    } catch (error) {
        console.error('Error joining VC:', error);
    }
}

async function playNext(message) {
    if (queue.length === 0 && !isLooping) {
        currentSong = null;
        if (message) message.reply('Queue finished');
        return;
    }
    
    let query;
    
    if (isLooping && currentSong) {
        query = currentSong;
    } else {
        query = queue.shift();
    }
    
    await playMusic(query, message);
}

async function playMusic(query, message) {
    try {
        if (!connection) {
            if (message) message.reply('Bot not connected to voice channel');
            return;
        }
        
        let url = query;
        
        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
            const searchResult = await play.search(query, { limit: 1 });
            if (!searchResult || searchResult.length === 0) {
                if (message) message.reply('Song not found');
                await playNext(message);
                return;
            }
            url = searchResult[0].url;
        }
        
        const stream = await play.stream(url, {
            quality: 2,
            discordPlayerCompatibility: true
        });
        
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
        });
        
        resource.volume?.setVolume(volume);
        
        if (!player) {
            player = createAudioPlayer();
            connection.subscribe(player);
            
            player.on(AudioPlayerStatus.Idle, async () => {
                await playNext(message);
            });
            
            player.on('error', async error => {
                console.error('Player error:', error);
                if (message) message.reply('Playback error occurred');
                await playNext(message);
            });
        }
        
        player.play(resource);
        currentSong = query;
        
        const info = await play.video_info(url);
        if (message) message.reply('Now playing: ' + info.video_details.title);
        
    } catch (error) {
        console.error('Error playing music:', error);
        if (message) message.reply('Failed to play song');
        await playNext(message);
    }
}
