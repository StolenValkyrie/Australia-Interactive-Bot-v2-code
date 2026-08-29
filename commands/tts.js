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

    if (subcommand === 'join') {
      const voiceChannel = member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({
          content: '❌ You need to be in a voice channel first.',
          ephemeral: true,
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
        return interaction.reply({
          content: '❌ Could not join the voice channel.',
          ephemeral: true,
        });
      }

      const player = getPlayer(guildId);
      connection.subscribe(player);

      return interaction.reply({ content: `✅ Joined **${voiceChannel.name}**.` });
    }

    if (subcommand === 'say') {
      const connection = getVoiceConnection(guildId);
      if (!connection) {
        return interaction.reply({
          content: '❌ I need to be in a voice channel first. Use `/tts join`.',
          ephemeral: true,
        });
      }

      const text = interaction.options.getString('text');

      await interaction.deferReply();

      try {
        const url = googleTTS.getAudioUrl(text, {
          lang: 'en',
          slow: false,
          host: 'https://translate.google.com',
        });

        const resource = createAudioResource(url);
        const player = getPlayer(guildId);

        player.play(resource);
        await entersState(player, AudioPlayerStatus.Playing, 10_000).catch(() => {});

        return interaction.editReply({ content: `🔊 Speaking: "${text}"` });
      } catch (err) {
        console.error('TTS error:', err);
        return interaction.editReply({ content: '❌ Failed to generate or play speech.' });
      }
    }

    if (subcommand === 'leave') {
      const connection = getVoiceConnection(guildId);
      if (!connection) {
        return interaction.reply({
          content: '❌ I am not in a voice channel.',
          ephemeral: true,
        });
      }

      connection.destroy();
      players.delete(guildId);

      return interaction.reply({ content: '👋 Left the voice channel.' });
    }
  },
};
