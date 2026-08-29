// tts.js
// Slash command: /tts join | say | leave
// Requires: @discordjs/voice @discordjs/opus ffmpeg-static google-tts-api libsodium-wrappers

const { SlashCommandBuilder } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  getVoiceConnection,
} = require('@discordjs/voice');
const googleTTS = require('google-tts-api');

const MAX_TTS_CHARS = 200; // Google TTS endpoint has a length limit per request

// Track one audio player per guild
const players = new Map(); // guildId -> AudioPlayer

function getPlayer(guildId) {
  if (!players.has(guildId)) {
    const player = createAudioPlayer();
    players.set(guildId, player);
  }
  return players.get(guildId);
}

// editReply can fail (e.g. "Unknown Message") in rare edge cases. Never let
// that throw uncaught — that's what was crashing the whole bot process.
async function safeEditReply(interaction, payload) {
  try {
    return await interaction.editReply(payload);
  } catch (err) {
    console.error('tts: editReply failed:', err);
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('Text-to-speech in voice channels')
    .addSubcommand(sub =>
      sub.setName('join').setDescription('Join your current voice channel')
    )
    .addSubcommand(sub =>
      sub
        .setName('say')
        .setDescription('Speak text in the voice channel')
        .addStringOption(opt =>
          opt
            .setName('text')
            .setDescription('Text to speak')
            .setRequired(true)
            .setMaxLength(MAX_TTS_CHARS)
        )
    )
    .addSubcommand(sub =>
      sub.setName('leave').setDescription('Leave the voice channel')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const member = interaction.member;
    const guildId = interaction.guildId;

    // Ack immediately, for every subcommand. Discord only gives a 3s window
    // to acknowledge — voice connection setup can easily take longer than
    // that, so we defer first and use editReply everywhere below.
    try {
      await interaction.deferReply();
    } catch (err) {
      console.error('tts: failed to defer reply:', err);
      return; // interaction is already dead, nothing more we can do
    }

    try {
      if (subcommand === 'join') {
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
          return safeEditReply(interaction, {
            content: '❌ You need to be in a voice channel first.',
          });
        }

        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guildId,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        try {
          await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
        } catch (err) {
          connection.destroy();
          return safeEditReply(interaction, {
            content: '❌ Could not join the voice channel.',
          });
        }

        const player = getPlayer(guildId);
        connection.subscribe(player);

        return safeEditReply(interaction, { content: `✅ Joined **${voiceChannel.name}**.` });
      }

      if (subcommand === 'say') {
        const connection = getVoiceConnection(guildId);
        if (!connection) {
          return safeEditReply(interaction, {
            content: '❌ I need to be in a voice channel first. Use `/tts join`.',
          });
        }

        const text = interaction.options.getString('text');

        const url = googleTTS.getAudioUrl(text, {
          lang: 'en',
          slow: false,
          host: 'https://translate.google.com',
        });

        const resource = createAudioResource(url);
        const player = getPlayer(guildId);

        player.play(resource);
        await entersState(player, AudioPlayerStatus.Playing, 10_000).catch(() => {});

        return safeEditReply(interaction, { content: `🔊 Speaking: "${text}"` });
      }

      if (subcommand === 'leave') {
        const connection = getVoiceConnection(guildId);
        if (!connection) {
          return safeEditReply(interaction, {
            content: '❌ I am not in a voice channel.',
          });
        }

        connection.destroy();
        players.delete(guildId);

        return safeEditReply(interaction, { content: '👋 Left the voice channel.' });
      }
    } catch (err) {
      console.error('tts execute error:', err);
      try {
        await safeEditReply(interaction, { content: '❌ Something went wrong running that command.' });
      } catch (editErr) {
        console.error('tts: failed to send error editReply:', editErr);
      }
    }
  },
};
