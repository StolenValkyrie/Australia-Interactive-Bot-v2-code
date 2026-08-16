const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong and latency information!'),

    async execute(interaction) {
        const sent = await interaction.reply({
            content: 'Pinging...',
            fetchReply: true
        });

        const pingTime =
            sent.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply(
            `Pong! 🏓\nLatency is ${pingTime}ms. API Latency is ${Math.round(interaction.client.ws.ping)}ms.`
        );
    }
};