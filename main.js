import dotenv from 'dotenv'
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice'
import Discord from 'discord.js'

dotenv.config()

const client = new Discord.Client({
    intents: [
        Discord.IntentsBitField.Flags.Guilds,
        Discord.IntentsBitField.Flags.GuildMessages,
        Discord.IntentsBitField.Flags.GuildVoiceStates,
        Discord.IntentsBitField.Flags.MessageContent,
    ],
})

const connections = {}

client.on('ready', () => {
    console.log(`> Logged in as ${client.user.tag}!`)
})

function joinChannel(msg) {
    if (!msg.member.voice.channelId)
        return msg.reply('Você precisa estar em um canal de voz para usar esse comando.')

    const guildId = msg.guildId
    const connection = joinVoiceChannel({
        channelId: msg.member.voice.channelId,
        guildId: guildId,
        adapterCreator: client.guilds.cache.get(msg.guildId).voiceAdapterCreator,
    })
    connections[guildId] = connection
    console.log(`> Bot joined ${guildId}`)
}

async function leaveChannel(msg) {
    const guildId = msg.guildId
    const connection = connections[guildId]
    if (!connection) return msg.reply('O bot não está em um canal de voz.')

    console.log(`> Bot leaving ${guildId}`)
    await connection.disconnect()
    delete connections[guildId]
}

function userJoined(connection) {
    if (!connection) return

    const resource = createAudioResource('./olha-ele-ae.mp3', {
        inlineVolume: true,
    })
    const player = createAudioPlayer()
    connection.subscribe(player)
    player.play(resource, { seek: 0, volume: 1 })
}

function hasJoined(oldState, newState) {
    return oldState.channel === null && newState.channel !== null
}
function hasLeft(oldState, newState) {
    return oldState.channel !== null && newState.channel === null
}
function isMe(state) {
    return state.member.user.tag === client.user.tag
}
client.on('voiceStateUpdate', (oldState, newState) => {
    if (hasJoined(oldState, newState)) return userJoined(connections[newState.guild.id])

    if (hasLeft(oldState, newState) && isMe(oldState)) {
        console.log(`> Bot left ${oldState.guild.id}`)
        delete connections[oldState.guild.id]
    }
})

const prefix = '!'
const commands = {
    join(msg) {
        joinChannel(msg)
    },
    leave(msg) {
        leaveChannel(msg)
    },
    play(msg) {
        userJoined(connections[msg.guildId])
    },
}

client.on('messageCreate', (msg) => {
    const content = msg.content.trim()
    if (!content.startsWith(prefix)) return

    const cmd = commands[content.slice(prefix.length)]
    if (!cmd) return
    try {
        cmd(msg)
    } catch (e) {
        msg.reply('Ocorreu um erro')
        console.error(e)
    }
})

client.login(process.env.TOKEN)
