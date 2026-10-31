// antiping.js
// Anti-ping system.
//
//   Pinging anyone with an ANTI-PING role (or the role itself) = 1 warning
//   3 warnings            -> 10 minute timeout
//   3 of those timeouts   -> 12 hour timeout
//   3 of those timeouts   -> 2 day timeout
//   3 of those timeouts   -> kick
//
// Members with the EXEMPT role can ping freely.
// Hooked up in index.js with:  require('./antiping')(client);

const fs = require('fs');
const path = require('path');
const { Events } = require('discord.js');

// =========================
// SETTINGS
// =========================

// Members with ANY of these roles must not be pinged (pinging the roles themselves also counts)
const ANTI_PING_ROLE_IDS = [
    '1499751119390376097',
    '1565729124385951885',
];

const EXEMPT_ROLE_ID = '1565695043036258345'; // people allowed to ping them

const LIMIT = 3; // 3 warnings = timeout, 3 timeouts = next level, ...

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Punishment levels, in order. The last one (null) is the kick.
const TIERS = [
    { label: '10 minute timeout', ms: 10 * MINUTE },
    { label: '12 hour timeout', ms: 12 * HOUR },
    { label: '2 day timeout', ms: 2 * DAY },
    { label: 'kick', ms: null },
];

// =========================
// STORAGE (data/antiping.json)
// =========================
// { "<userId>": { warnings: 0, counts: [timeouts at level 1, level 2, level 3] } }

const dataFile = path.join(__dirname, 'data', 'antiping.json');

function load() {
    try {
        return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } catch (error) {
        return {};
    }
}

function save(data) {
    try {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error('❌ Could not write antiping.json:', error);
    }
}

// =========================
// THE LADDER
// =========================
// Adds one ping to a record. Returns the punishment level to apply
// (0 = 10m, 1 = 12h, 2 = 2d, 3 = kick), or null if it was just a warning.

function registerPing(record) {

    record.warnings++;

    if (record.warnings < LIMIT) return null;

    record.warnings = 0;

    let tier = 0;

    while (tier < 3) {

        record.counts[tier]++;

        if (record.counts[tier] < LIMIT) break;

        record.counts[tier] = 0;
        tier++;
    }

    return tier;
}

// =========================
// FIND WHO WAS PINGED
// =========================
// Returns text for the protected target that was pinged, or null.
// Several protected pings in one message still count as ONE ping.

async function findProtectedTarget(message) {

    const pingedRoleId = ANTI_PING_ROLE_IDS.find(id => message.mentions.roles.has(id));

    if (pingedRoleId) {
        return `<@&${pingedRoleId}>`;
    }

    for (const [id, user] of message.mentions.users) {

        if (user.bot || id === message.author.id) continue;

        const member =
            message.mentions.members?.get(id) ||
            await message.guild.members.fetch(id).catch(() => null);

        if (member && ANTI_PING_ROLE_IDS.some(roleId => member.roles.cache.has(roleId))) {
            return `<@${id}>`;
        }
    }

    return null;
}

// =========================
// LISTENER
// =========================

module.exports = client => {

    client.on(Events.MessageCreate, async message => {

        try {

            if (message.author.bot) return;
            if (!message.guild) return;

            // Nothing mentioned, nothing to check
            if (!message.mentions.users.size && !message.mentions.roles.size) return;

            const member =
                message.member ||
                await message.guild.members.fetch(message.author.id).catch(() => null);

            if (!member) return;

            // Exempt role can ping freely
            if (member.roles.cache.has(EXEMPT_ROLE_ID)) return;

            const target = await findProtectedTarget(message);

            if (!target) return;

            // =========================
            // ADD THE WARNING
            // =========================

            const data = load();

            const record = data[message.author.id] || { warnings: 0, counts: [0, 0, 0] };

            const tier = registerPing(record);

            const reply = content =>
                message.reply({
                    content,
                    allowedMentions: { users: [message.author.id] }
                }).catch(() => {});

            // =========================
            // JUST A WARNING
            // =========================

            if (tier === null) {

                data[message.author.id] = record;
                save(data);

                await reply(
                    `⚠️ <@${message.author.id}>, you are not allowed to ping ${target}. ` +
                    `**Warning ${record.warnings}/${LIMIT}**`
                );

                return;
            }

            const punishment = TIERS[tier];
            const reason = `Anti-ping: pinged a protected member (${punishment.label})`;

            // =========================
            // KICK (and wipe their record)
            // =========================

            if (punishment.ms === null) {

                delete data[message.author.id];
                save(data);

                await reply(
                    `🚫 <@${message.author.id}> pinged a protected member too many times and has been **kicked**.`
                );

                try {
                    await member.kick(reason);
                } catch (error) {
                    console.error('antiping: could not kick:', error.message);
                    await message.channel.send(
                        '❌ I could not kick that member. Check my permissions and role position.'
                    ).catch(() => {});
                }

                return;
            }

            // =========================
            // TIMEOUT
            // =========================

            data[message.author.id] = record;
            save(data);

            await reply(
                `🔇 <@${message.author.id}> pinged ${target} and received a **${punishment.label}** ` +
                `(${record.counts[tier]}/${LIMIT} at this level).`
            );

            try {
                await member.timeout(punishment.ms, reason);
            } catch (error) {
                console.error('antiping: could not timeout:', error.message);
                await message.channel.send(
                    '❌ I could not timeout that member. Check my permissions and role position.'
                ).catch(() => {});
            }

        } catch (error) {

            console.error('antiping error:', error);
        }
    });
};