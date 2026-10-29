// tickets.js
// Slash command: /tickets [user] [lookup]
// Staff-only. Browse every closed ticket and open its transcript.

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const config = require('../ticket/config');
const { isStaff } = require('../ticket/handler');
const { openDatabase } = require('../ticket/dbview');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('Browse closed tickets and their transcripts')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Only show tickets opened by this member')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('lookup')
                .setDescription('Search by Lookup ID, Ticket ID or ticket type (e.g. GEN301AI)')
                .setRequired(false)
        ),

    async execute(interaction) {

        // The -tickets text version can't show this screen
        if (typeof interaction.options.getUser !== 'function') {
            return interaction.reply({ content: 'Use the `/tickets` slash command for this one.' });
        }

        if (!isStaff(interaction.member)) {
            return interaction.reply({
                content: config.messages.staffOnly,
                flags: MessageFlags.Ephemeral,
            });
        }

        const user = interaction.options.getUser('user');
        const lookup = interaction.options.getString('lookup');

        if (user && lookup) {
            return interaction.reply({
                content: '❌ Use either `user` or `lookup`, not both.',
                flags: MessageFlags.Ephemeral,
            });
        }

        return interaction.reply({
            components: [openDatabase({ userId: user?.id, query: lookup })],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
    },
};