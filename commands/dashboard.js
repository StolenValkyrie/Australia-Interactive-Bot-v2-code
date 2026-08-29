// dashboard.js
// Slash command: /dashboard
// Posts the server dashboard panel to a fixed channel instead of replying
// in the channel the command was used in.

const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');

// Channel the dashboard panel gets posted to, regardless of where the
// command is run from.
const DASHBOARD_CHANNEL_ID = '1396105436662464563';

function buildDashboardContainer(guild) {
    return new ContainerBuilder()
        .setAccentColor(0x5865F2)

        // Banner
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(
                            'https://cdn.phototourl.com/free/2026-08-12-0e5ced57-9357-4d18-8541-a20e86064f98.webp'
                        )
                )
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(1)
        )

        // Title
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Server Dashboard')
        )

        // Description
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `Welcome to the dashboard for **${guild.name}**. Use the menu below to open a ticket or view server guidelines.`
            )
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(1)
        )

        // Ticket selection menu
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_select')
                    .setPlaceholder('Select a dashboard option')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Support')
                            .setDescription('Get help from the support team')
                            .setValue('support')
                            .setEmoji('🛠️'),

                        new StringSelectMenuOptionBuilder()
                            .setLabel('Report')
                            .setDescription('Report a player or issue')
                            .setValue('report')
                            .setEmoji('🚨'),

                        new StringSelectMenuOptionBuilder()
                            .setLabel('Other')
                            .setDescription('Create another type of ticket')
                            .setValue('other')
                            .setEmoji('📩'),

                        new StringSelectMenuOptionBuilder()
                            .setLabel('Guidelines')
                            .setDescription('The guidelines for the guild!')
                            .setValue('guidelines')
                            .setEmoji('📖')
                    )
            )
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(1)
        )

        // Footer
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                'Waratah Heights • Rules & Guidelines\nWebsite: https://australia-interactive-website.web.app/'
            )
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Posts the server dashboard panel')
        // Only staff/admins should be able to trigger this — it posts
        // publicly to a fixed channel, so it shouldn't be open to everyone.
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // Acknowledge privately first — the actual panel goes to the
        // dashboard channel, not here, so keep this reply ephemeral.
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channel = await interaction.client.channels
            .fetch(DASHBOARD_CHANNEL_ID)
            .catch(() => null);

        if (!channel) {
            return interaction.editReply({
                content: `❌ Could not find the dashboard channel (\`${DASHBOARD_CHANNEL_ID}\`). Check the ID and my access to it.`,
            });
        }

        const container = buildDashboardContainer(interaction.guild);

        try {
            await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (err) {
            console.error('dashboard: failed to post panel:', err);
            return interaction.editReply({
                content: '❌ Something went wrong posting the dashboard. Check my permissions in that channel.',
            });
        }

        return interaction.editReply({
            content: `✅ Dashboard posted to <#${DASHBOARD_CHANNEL_ID}>.`,
        });
    },
};
