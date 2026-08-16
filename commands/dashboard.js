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
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Opens the server dashboard'),

    async execute(interaction) {
        const container = new ContainerBuilder()
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

            // Separator
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(1)
            )

            // Title
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent('# Server Dashboard')
            )

            // Description
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `This is the dashboard for ${interaction.guild.name}. Use the options below to manage your server.`
                    )
            )

            // Ticket selection menu
            .addActionRowComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('ticket_select')
                            .setPlaceholder('Select a dashboard option')
                            .addOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel('Support')
                                    .setDescription(
                                        'Get help from the support team'
                                    )
                                    .setValue('support')
                                    .setEmoji('🛠️'),

                                new StringSelectMenuOptionBuilder()
                                    .setLabel('Report')
                                    .setDescription(
                                        'Report a player or issue'
                                    )
                                    .setValue('report')
                                    .setEmoji('🚨'),

                                new StringSelectMenuOptionBuilder()
                                    .setLabel('Other')
                                    .setDescription(
                                        'Create another type of ticket'
                                    )
                                    .setValue('other')
                                    .setEmoji('📩'),

                                new StringSelectMenuOptionBuilder()
                                    .setLabel('Guidelines')
                                    .setDescription(
                                        'The guidelines for the guild!'
                                    )
                                    .setValue('guidelines')
                                    .setEmoji('📖')

                            )
                    )
            )

            // Separator
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(1)
            )

           .addSeparatorComponents(
    new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(1)
)

// Footer
.addTextDisplayComponents(
    new TextDisplayBuilder()
        .setContent(
            'Waratah Heights • Rules & Guidelines\nWebsite: https://australia-interactive-website.web.app/'
        )
);

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};