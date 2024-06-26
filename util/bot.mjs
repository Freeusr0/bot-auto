import Database from "st.db";
import { Client, MessageActionRow, TextInputComponent, Modal } from 'discord.js';
import { createSpinner } from "nanospinner";
import SyncCommands from "./SyncCommands.mjs";
import replit from "quick.replit"
const config_replit_db = new replit.Database(process.env["REPLIT_DB_URL"])
const config = new Database({ path: "./config.json", databaseInObject: true })
const responses_db = new Database({ path: "./responses_db.yml" })

export default async function () {
    console.clear()
    const spinner = createSpinner(`Bot processing by \u001b[32;1mShuruhatik#2443\u001b[0m`).start({ color: 'green' })
    const client = new Client({ intents: 32767 })
    const token = await config_replit_db.get(`token`)
    client.login(token).then(() => {
        spinner.update({ text: 'Running the bot...' })
    }).catch(async () => {
        spinner.error({ text: 'Invalid Bot Token' })
        await config_replit_db.delete(`token`)
    })
    client.on("ready", async () => {
        await SyncCommands(client)
        client.user.setActivity(`${config.get("status_bot")}`, { type: config.get("status_type") });
        let bot_invite_link = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=applications.commands%20bot`
        spinner.success({ text: `Logged in as ${client.user.tag} (${client.user.id})` })
        console.log("\u001b[32m▣\u001b[0m \u001b[0mBot Run By \u001b[34;1mShuruhatik#2443\u001b[0m")
        console.log("\u001b[32m▣ \u001b[0m\u001b[0m\u001b[40;1m\u001b[34;1mhttps://api.shuruhatik.com/add/"+client.user.id+"\u001b[0m")
    })

    client.on("messageCreate", async (message) => {
        if (message.author.bot || !message.guild) return;
        let all_triggers = await responses_db.all();
        if (all_triggers.some(u => message.cleanContent.includes(u.data.trigger) && u.data.wildcard || u.data.trigger == message.cleanContent && !u.data.wildcard)) {
            let response_data = all_triggers.find(u => message.cleanContent.includes(u.data.trigger) && u.data.wildcard || u.data.trigger == message.cleanContent && !u.data.wildcard).data;
            let response = response_data.responses.length == 1 ? response_data.responses[0] : response_data.responses[Math.floor(Math.random() * response_data.responses.length)];
            let responseContent = response.replaceAll("[user]", message.author.toString()).replaceAll("[userAvatarURL]", message.author.avatarURL({ dynamic: true })).replaceAll("[userId]", message.author.id).replaceAll("[userName]", message.author.username)
            if (response_data.reply == 1) message.reply(responseContent)
            else message.channel.send(responseContent)
        }
    })

    client.on("interactionCreate", async (interaction) => {
        if (interaction.isCommand()) {
            if (interaction.commandName == "auto-responses") {
                if (!interaction.member.permissions.has("ADMINISTRATOR")) return await interaction.reply({ content: `لا يمكننك القيام بهذا الأمر :x:`, ephemeral: true })
                if (interaction.options.data[0].name == 'list') {
                    await interaction.deferReply({ ephemeral: true })
                    await interaction.editReply({ content: "📃 ملف الردود التلقائية المسجلة", files: [{ attachment: `./responses_db.yml`, name: "responses.txt" }] })
                }
                if (interaction.options.data[0].name == 'remove') {
                    let response_id = interaction.options.data[0].options[0].value
                    if (!await responses_db.has(response_id)) return interaction.reply({ content: `لا يمكننك حذف رد غير موجود :x:`, ephemeral: true })
                    await responses_db.delete(response_id)
                    await interaction.reply({ content: `تم حذف الرد بنجاح ✅`, ephemeral: true })
                }
                if (interaction.options.data[0].name == 'add') {
                    let modal = new Modal()
                        .setCustomId(`auto-responses_${interaction.options.data[0].options[0].value ? 1 : 0}_` + Date.now())
                        .setTitle('إضافة رد تلقائي');
                    let Input1 = new TextInputComponent()
                        .setCustomId('trigger')
                        .setLabel("الرسالة")
                        .setStyle('SHORT')
                        .setPlaceholder("اذا وضعت نجمة بالاول ثم يتم بحث عن الجملة ضمن الرسالة")
                        .setMaxLength(1000)
                        .setMinLength(2);
                    let Input2 = new TextInputComponent()
                        .setCustomId('response_1')
                        .setLabel("الرد")
                        .setMinLength(2)
                        .setStyle('PARAGRAPH')
                        .setPlaceholder(`المتغيرات\n[user] [userName] [userId] [userAvatarURL]\nيمكننك استخدامهم في جميع الردود`);
                    let Input3 = new TextInputComponent()
                        .setCustomId('response_2')
                        .setLabel("الرد الثاني (غير إلزامي)")
                        .setMinLength(0)
                        .setStyle('PARAGRAPH')
                        .setRequired(false)
                        .setPlaceholder(`ليس اجباري ولكن اذا قمت بكتابته سوف يتم اختيار عشوائي لشخص بين الردود`);
                    let Input4 = new TextInputComponent()
                        .setCustomId('response_3')
                        .setLabel("الرد الثالث (غير إلزامي)")
                        .setMinLength(0)
                        .setStyle('PARAGRAPH')
                        .setRequired(false)
                        .setPlaceholder(`ليس اجباري ولكن اذا قمت بكتابته سوف يتم اختيار عشوائي لشخص بين الردود`);
                    let Input5 = new TextInputComponent()
                        .setCustomId('response_4')
                        .setRequired(false)
                        .setMinLength(0)
                        .setLabel("الرد الرابع (غير إلزامي)")
                        .setStyle('PARAGRAPH')
                        .setPlaceholder(`ليس اجباري ولكن اذا قمت بكتابته سوف يتم اختيار عشوائي لشخص بين الردود`);
                    modal.addComponents(new MessageActionRow().addComponents(Input1), new MessageActionRow().addComponents(Input2), new MessageActionRow().addComponents(Input3), new MessageActionRow().addComponents(Input4), new MessageActionRow().addComponents(Input5));
                    await interaction.showModal(modal);
                }
            }
        }
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith("auto-responses_")) {
                await interaction.deferReply()
                let responses = []
                let response_id = Math.random().toString(36).substr(2, 9)
                for (let i = 1; i <= 4; i++) {
                    if (interaction.fields.getTextInputValue(`response_${i}`)) {
                        responses.push(interaction.fields.getTextInputValue(`response_${i}`))
                    }
                }
                await responses_db.set({
                    key: response_id, value: {
                        trigger: interaction.fields.getTextInputValue("trigger").startsWith("*") ? interaction.fields.getTextInputValue("trigger").slice(1) : interaction.fields.getTextInputValue("trigger"),
                        responses,
                        reply: +interaction.customId.split("_")[1],
                        wildcard: interaction.fields.getTextInputValue("trigger").startsWith("*") ? true : false
                    }
                })
                await interaction.editReply({
                    content: `تم إضافة الرد بنجاح ✅`, embeds: [{
                        color: 0x00ff00,
                        fields: [{ name: "الرد الجديد", value: `${interaction.fields.getTextInputValue("trigger").startsWith("*") ? interaction.fields.getTextInputValue("trigger").slice(1) : interaction.fields.getTextInputValue("trigger")}` }, { name: "الايدي", value: `||\`${response_id}\`||` }]
                    }]
                })

            }
        }
    })
}