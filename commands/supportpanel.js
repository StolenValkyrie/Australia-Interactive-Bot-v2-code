// supportpanel.js
// Slash command: /supportpanel
// Posts the support ticket panel (General / High Rankings / Partnerships / Report).

const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');

const config = require('../ticket/config');
const { buildPanel } = require('../ticket/handler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('supportpanel')
        .setDescription('Posts the support ticket panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Post in the configured channel, or the current one if none is set
        const channel = config.panelChannelId
            ? await interaction.client.channels.fetch(config.panelChannelId).catch(() => null)
            : interaction.channel;

        if (!channel) {
            return interaction.editReply({
                content: `❌ Could not find the panel channel (\`${config.panelChannelId}\`). Check the ID and my access to it.`,
            });
        }

        try {
            await channel.send({
                components: [buildPanel()],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (err) {
            console.error('supportpanel: failed to post panel:', err);
            return interaction.editReply({
                content: '❌ Something went wrong posting the panel. Check my permissions and the image links in ticket/config.js.',
            });
        }

        return interaction.editReply({ content: `✅ Support panel posted to <#${channel.id}>.` });
    },
};