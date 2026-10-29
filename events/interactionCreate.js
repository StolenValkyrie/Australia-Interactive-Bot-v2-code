
const {
    Events,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
} = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        // Rules button handler
        if (
            interaction.isButton() &&
            interaction.customId === 'rules'
        ) {
            const rulesContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('# Rules')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(1)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        [
                            '## 1. Be Respectful',
                            'Treat everyone with respect. Harassment and personal attacks are not allowed.',
                            '',
                            '## 2. No Spam',
                            'Avoid spam, flooding, and unnecessary repeated messages.',
                            '',
                            '## 3. Follow Discord ToS',
                            'Everyone must follow Discord’s Terms of Service and Community Guidelines.',
                            '',
                            '## 4. No Unauthorised Advertising',
                            'Do not advertise without permission from the staff team.',
                            '',
                            '## 5. Follow Staff Instructions',
                            'Listen to moderators and follow their instructions.',
                            '',
                            '## 6. Keep Channels Appropriate',
                            'Use the correct channels and follow their specific guidelines.',
                            '',
                            '## 7. No Exploiting',
                            'Do not abuse bots, exploits, or server features.',
                            '',
                            '## 8. Use Common Sense',
                            'Respect the community and help keep the server welcoming.',
                            '',
                            'Breaking these rules will lead to moderation action, and severe rule violations will result in a kick, or ban if severity reaches a certain point.',
                        ].join('\n')
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

            await interaction.reply({
                components: [rulesContainer],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral,
            });

            return;
        }

        // Keep your existing slash-command handling below this point.
    },
};
