
const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');

// Dashboard channel
const DASHBOARD_CHANNEL_ID = '1396105436662464563';

// Build your dashboard here
function buildDashboardContainer(guild) {
    return new ContainerBuilder()
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(
                    'https://cdn.phototourl.com/member/2026-10-29-17504ecd-49eb-4b0d-a08d-ea893fbdf086.png'
                )
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(1)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Dashboard'),
            new TextDisplayBuilder().setContent('> Welcome to the Australia Interactive Dashboard. Rules are placed here.')
        )


.addActionRowComponents(
    new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('rules')
            .setLabel('Rules')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('memberbutton')
            .setLabel(`${guild.memberCount} Members`)
            .setStyle(ButtonStyle.Secondary)
    )
)


        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(1)
        )

        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(
                    'https://cdn.phototourl.com/member/2026-10-28-d4604693-3a08-4375-aa89-4890cbb8a10a.png'
                )
            )
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Posts the server dashboard panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        const channel = await interaction.client.channels
            .fetch(DASHBOARD_CHANNEL_ID)
            .catch(() => null);

        if (!channel || !channel.isTextBased()) {
            return interaction.editReply({
                content: '❌ Could not find a usable dashboard channel. Check the channel ID and bot permissions.',
            });
        }

        try {
            const container = buildDashboardContainer(interaction.guild);

            await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });

            return interaction.editReply({
                content: `✅ Dashboard posted to <#${DASHBOARD_CHANNEL_ID}>.`,
            });
        } catch (err) {
            console.error('dashboard: failed to post panel:', err);

            return interaction.editReply({
                content: '❌ Failed to post the dashboard. Check the bot permissions and component configuration.',
            });
        }
    },
};
