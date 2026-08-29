
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
        .setDescription('Send the Roblox verification panel'),

    async execute(interaction) {

        const apiKey = process.env.DOCK_API_KEY;
        const pid = process.env.DOCK_PID;

        if (!apiKey || !pid) {

            console.error(
                'DOCK_API_KEY or DOCK_PID is missing.'
            );

            return interaction.reply({
                content:
                    '❌ Verification is not configured correctly.',
                flags:
                    MessageFlags.Ephemeral
            });
        }

        try {

            // =========================
            // CREATE DOCK SESSION
            // =========================

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

            if (!response.ok) {

                console.error(
                    'Dock API error:',
                    result
                );

                return interaction.reply({
                    content:
                        '❌ Could not create a verification session.',
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            const session =
                result.data;

            if (!session?.verifyUrl) {

                console.error(
                    'Dock did not return a verification URL:',
                    result
                );

                return interaction.reply({
                    content:
                        '❌ Dock did not return a verification URL.',
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            // =========================
            // CREATE PANEL
            // =========================

            const container =
                new ContainerBuilder()

                    .setAccentColor(
                        0x5865F2
                    )

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
                                '### Verify your Roblox account'
                            )
                    )

                    .addTextDisplayComponents(

                        new TextDisplayBuilder()
                            .setContent(
                                'Click the **Verify** button below to begin verifying your Roblox account with Dock.'
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

                                    .setCustomId(
                                        'dock_verify'
                                    )

                                    .setLabel(
                                        'Verify'
                                    )

                                    .setEmoji(
                                        '🔗'
                                    )

                                    .setStyle(
                                        ButtonStyle.Primary
                                    )
                            )
                    );

            // =========================
            // STORE SESSION URL
            // =========================

            // The URL is attached to the message so
            // the button handler can retrieve it.
            await interaction.channel.send({

                components:
                    [container],

                flags:
                    MessageFlags.IsComponentsV2,

                allowedMentions: {
                    parse: []
                }
            });

            // =========================
            // COMMAND CONFIRMATION
            // =========================

            await interaction.reply({

                content:
                    '✅ Verification panel sent!',

                flags:
                    MessageFlags.Ephemeral
            });

        } catch (error) {

            console.error(
                'Dock verification error:',
                error
            );

            if (!interaction.replied) {

                await interaction.reply({

                    content:
                        '❌ An error occurred while creating the verification panel.',

                    flags:
                        MessageFlags.Ephemeral
                });
            }
        }
    }
};

