const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const dataFolder = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataFolder, 'stickies.json');

// Make sure the data folder exists
if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

// Make sure the JSON file exists
if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '{}');
}


// =========================
// LOAD STICKIES
// =========================

function loadStickies() {
    try {
        return JSON.parse(
            fs.readFileSync(dataFile, 'utf8')
        );
    } catch (error) {
        console.error(
            '❌ Could not load stickies.json:',
            error
        );

        return {};
    }
}


// =========================
// SAVE STICKIES
// =========================

function saveStickies(stickies) {
    fs.writeFileSync(
        dataFile,
        JSON.stringify(stickies, null, 4)
    );
}


module.exports = {

    data: new SlashCommandBuilder()

        .setName('sticky')

        .setDescription(
            'Manage sticky messages'
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        )


        // =========================
        // SET
        // =========================

        .addSubcommand(subcommand =>
            subcommand

                .setName('set')

                .setDescription(
                    'Set a sticky message in this channel'
                )

                .addStringOption(option =>
                    option

                        .setName('message')

                        .setDescription(
                            'The message to keep at the bottom'
                        )

                        .setRequired(true)
                )
        )


        // =========================
        // REMOVE
        // =========================

        .addSubcommand(subcommand =>
            subcommand

                .setName('remove')

                .setDescription(
                    'Remove the sticky message'
                )
        ),


    async execute(interaction) {

        // =========================
        // PERMISSION CHECK
        // =========================

        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.ManageMessages
            )
        ) {

            return interaction.reply({

                content:
                    '❌ You do not have permission to manage sticky messages.',

                flags:
                    MessageFlags.Ephemeral
            });
        }


        const subcommand =
            interaction.options.getSubcommand();


        const channelId =
            interaction.channel.id;


        const stickies =
            loadStickies();


        // =========================
        // SET STICKY
        // =========================

        if (subcommand === 'set') {

            const message =
                interaction.options.getString(
                    'message'
                );


            // Delete old sticky
            if (stickies[channelId]) {

                try {

                    const oldMessage =
                        await interaction.channel.messages.fetch(
                            stickies[channelId].messageId
                        );

                    await oldMessage.delete();

                } catch {
                    // Old message may already be deleted
                }
            }


            // Create new sticky
            const stickyMessage =
                await interaction.channel.send({

                    content:
                        `📌 **Sticky Message**\n\n${message}`
                });


            // Save it
            stickies[channelId] = {

                message: message,

                messageId:
                    stickyMessage.id
            };


            saveStickies(stickies);


            await interaction.reply({

                content:
                    '✅ Sticky message set!',

                flags:
                    MessageFlags.Ephemeral
            });


            return;
        }


        // =========================
        // REMOVE STICKY
        // =========================

        if (subcommand === 'remove') {

            if (!stickies[channelId]) {

                return interaction.reply({

                    content:
                        '❌ There is no sticky message in this channel.',

                    flags:
                        MessageFlags.Ephemeral
                });
            }


            try {

                const stickyMessage =
                    await interaction.channel.messages.fetch(
                        stickies[channelId].messageId
                    );

                await stickyMessage.delete();

            } catch {
                // Message may already be gone
            }


            delete stickies[channelId];

            saveStickies(stickies);


            await interaction.reply({

                content:
                    '✅ Sticky message removed!',

                flags:
                    MessageFlags.Ephemeral
            });
        }
    }
};