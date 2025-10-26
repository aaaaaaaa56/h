module.exports = {
    Token: process.env.TOKEN,
    Guild: process.env.GUILD_ID,
    Channel: process.env.CHANNEL_ID,
    selfDeaf: process.env.SELF_DEAF === 'true',
    selfMute: process.env.SELF_MUTE === 'true'
};
