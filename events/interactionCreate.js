
const {
    Events,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
} = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        if (!interaction.isButton()) return;

        // RULES BUTTON
        if (interaction.customId === 'rules') {
            const rulesContainer = new ContainerBuilder()
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder()
                        .addItems(
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
                    new TextDisplayBuilder().setContent(
                        [
                            '# Rules',
                            '',
                            '## 1. Be Respectful',
                            'Treat everyone with respect. Harassment and personal attacks are not allowed.',
                            '',
                            '## 2. No Spam',
                            'Avoid spam, flooding, and unnecessary repeated messages.',
                            '',
                            '## 3. Follow Discord ToS',
                            'Follow Discord’s Terms of Service and Community Guidelines.',
                            '',
                            '## 4. No Unauthorised Advertising',
                            'Do not advertise without staff permission.',
                            '',
                            '## 5. Follow Staff Instructions',
                            'Listen to moderators and follow their instructions.',
                            '',
                            '## 6. Keep Channels Appropriate',
                            'Use the correct channels and follow their guidelines.',
                            '',
                            '## 7. No Exploiting',
                            'Do not abuse bots, exploits, or server features.',
                            '',
                            '## 8. Use Common Sense',
                            'Respect the community and help keep the server welcoming.',
                            '',
                            'Breaking these rules may result in moderation action, including a kick or ban depending on severity.',
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

            return interaction.reply({
                components: [rulesContainer],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral,
            });
        }

        // MEMBER COUNT BUTTON
        if (interaction.customId === 'memberbutton') {
            await interaction.deferReply({
                flags: MessageFlags.Ephemeral,
            });

            try {
                const guild = interaction.guild;

                if (!guild) {
                    return interaction.editReply({
                        content: '❌ This button can only be used inside a server.',
                    });
                }

                const members = await guild.members.fetch();

                const total = members.size;
                const bots = members.filter(
                    member => member.user.bot
                ).size;
                const humans = total - bots;

                return interaction.editReply({
                    content: [
                        '## Server Member Count',
                        '',
                        `**Total Members:** ${total.toLocaleString()}`,
                        `**Human Members:** ${humans.toLocaleString()}`,
                        `**Bots:** ${bots.toLocaleString()}`,
                    ].join('\n'),
                });
            } catch (error) {
                console.error('Member count error:', error);

                return interaction.editReply({
                    content: '❌ Could not fetch the server member count. Please try again later.',
                });
            }
        }
    },
};
