
const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
    
} = require('discord.js');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Send the Roblox verification panel'),

    async execute(interaction) {

        const container =
            new ContainerBuilder()
                .setAccentColor(0x5865F2)

            .addMediaGalleryComponents(
    new MediaGalleryBuilder()
        .addItems(
            new MediaGalleryItemBuilder()
                .setURL('https://cdn.phototourl.com/free/2026-08-29-6dd0b31e-ed94-4abc-8c30-769955528ef9.webp')
        )
)

                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(1)
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            '### Australia Interactive Roblox Verification'
                        )
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            'Click the **Verify** button below to link your Roblox account with Discord.'
                        )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(1)
                )

                .addActionRowComponents(
                    new ActionRowBuilder()
                        .addComponents(

                            new ButtonBuilder()
                                .setCustomId('dock_verify')
                                .setLabel('Verify')
                                .setStyle(ButtonStyle.Primary)
                        )
                )

        .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(1)
                )

        .addMediaGalleryComponents(
    new MediaGalleryBuilder()
        .addItems(
            new MediaGalleryItemBuilder()
                .setURL('https://files.catbox.moe/apbldk.gif')
        )
);

        await interaction.channel.send({

            components: [container],

            flags: MessageFlags.IsComponentsV2
        });

        await interaction.reply({

            content:
                '✅ Verification panel sent!',

            flags:
                MessageFlags.Ephemeral
        });
    }
};

