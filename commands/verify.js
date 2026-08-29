
const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');

const API_URL = 'https://api.docksys.xyz';

module.exports = {

    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your Roblox account'),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const apiKey = process.env.DOCK_API_KEY;
        const pid = process.env.DOCK_PID;

        if (!apiKey || !pid) {

            console.error(
                'DOCK_API_KEY or DOCK_PID is missing.'
            );

            return interaction.editReply({
                content:
                    '❌ Verification is not configured correctly.'
            });
        }

        try {

            const response = await fetch(
                `${API_URL}/v2/sessions`,
                {
                    method: 'POST',

                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({

                        pid: pid,

                        clientId:
                            interaction.user.id,

                        guildId:
                            interaction.guild.id
                    })
                }
            );

            const result =
                await response.json();

            console.log(
                'Dock response:',
                result
            );

            if (!response.ok) {

                console.error(
                    'Dock API error:',
                    result
                );

                return interaction.editReply({
                    content:
                        '❌ Could not create a verification session.'
                });
            }

            const session =
                result.data;

            if (!session?.verifyUrl) {

                console.error(
                    'No verification URL returned:',
                    result
                );

                return interaction.editReply({
                    content:
                        '❌ Dock did not return a verification URL.'
                });
            }

            // =========================
            // COMPONENTS V2 EMBED
            // =========================

            const container =
                new ContainerBuilder()
                    .setAccentColor(0x5865F2)

                    .addTextDisplayComponents(

                        new TextDisplayBuilder()
                            .setContent(
                                '# 🔐 Roblox Verification'
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
                                'Click the **Verify** button below to connect your Roblox account to Discord.'
                            )
                    )

                    .addTextDisplayComponents(

                        new TextDisplayBuilder()
                            .setContent(
                                'Once you have completed the verification process, you will be linked automatically.'
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

                                    .setLabel('Verify')

                                    .setEmoji('🔗')

                                    .setStyle(
                                        ButtonStyle.Link
                                    )

                                    .setURL(
                                        session.verifyUrl
                                    )
                            )
                    );

            return interaction.editReply({

                components: [container],

                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });

        } catch (error) {

            console.error(
                'Dock verification error:',
                error
            );

            return interaction.editReply({
                content:
                    '❌ An error occurred while starting verification.'
            });
        }
    }
};
