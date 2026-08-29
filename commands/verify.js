```js
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

        const container = new ContainerBuilder()
            .setAccentColor(0x5865F2)

            // =========================
            // TOP IMAGE
            // =========================

            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(
                                'https://cdn.phototourl.com/free/2026-08-29-6dd0b31e-ed94-4abc-8c30-769955528ef9.webp'
                            )
                    )
            )

            // =========================
            // SEPARATOR
            // =========================

            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(1)
            )

            // =========================
            // TITLE
            // =========================

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        '### Australia Interactive Roblox Verification'
                    )
            )

            // =========================
            // DESCRIPTION
            // =========================

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        'Click the **Verify** button below to link your Roblox account with Discord.'
                    )
            )

            // =========================
            // SEPARATOR
            // =========================

            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(1)
            )

            // =========================
            // VERIFY BUTTON
            // =========================

            .addActionRowComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('dock_verify')
                            .setLabel('Verify')
                            .setStyle(ButtonStyle.Primary)
                    )
            );

        // =========================
        // VERIFY CHANNEL
        // =========================

        const verifyChannel =
            await interaction.guild.channels.fetch(
                '1466957818857918568'
            );

        if (!verifyChannel) {

            await interaction.reply({
                content:
                    '❌ Verification channel not found.',
                flags:
                    MessageFlags.Ephemeral
            });

            return;
        }

        // =========================
        // SEND PANEL
        // =========================

        await verifyChannel.send({

            components:
                [container],

            flags:
                MessageFlags.IsComponentsV2

        });

        // =========================
        // CONFIRMATION
        // =========================

        await interaction.reply({

            content:
                '✅ Verification panel sent to <#1466957818857918568>!',

            flags:
                MessageFlags.Ephemeral

        });

    }
};
```

This keeps your **Media Gallery**, **Components V2**, and **Verify button**, while making `/verify` always send the panel to channel `1466957818857918568`.
