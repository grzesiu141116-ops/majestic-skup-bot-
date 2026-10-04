const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  PermissionFlagsBits, 
  REST, 
  Routes, 
  SlashCommandBuilder 
} = require('discord.js');
const http = require('http');

// TUTAJ WKLEJ ID SWOJEGO PRYWATNEGO KANAŁU SZTABOWEGO (np. '123456789012345678')
const PRIVATE_ADMIN_CHANNEL_ID = 'WPISZ_TUTAJ_ID_PRYWATNEGO_KANALU';

// Serwer HTTP dla Render.com
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Skup MajesticRP v3 dziala!');
}).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName('setup_skup')
    .setDescription('Tworzy publiczny panel skupu przedmiotow MajesticRP')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

client.once('ready', async () => {
  console.log(`✅ Bot zalogowany jako: ${client.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Komenda /setup_skup zostala pomyślnie zarejestrowana!');
  } catch (error) {
    console.error('❌ Błąd rejestracji komend:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  // 1. Wysyłanie publicznego panelu (/setup_skup)
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup_skup') {
    const embed = new EmbedBuilder()
      .setTitle('🏬 SKUP UNIKATÓW & MYTHICÓW — MAJESTIC RP')
      .setDescription(
        '**Szybka gotówka od ręki bez marnowania czasu na rynku!**\n\n' +
        'Chcesz szybko sprzedać rzadkie ubrania, unikatowe pojazdy lub akcesoria?\n' +
        'Złóż ofertę, a rozpatrzymy ją w kilka minut!\n\n' +
        '📌 **Zasady Skupu:**\n' +
        '• Skupujemy przedmioty za **50% – 70%** wartości rynkowej.\n' +
        '• Nie skupujemy zwykłych ubrań ze sklepów ani podstawowych aut.\n' +
        '• Odpowiedź z decyzją lub kontrofertą otrzymasz na PW od bota!'
      )
      .setColor(0x2b2d31)
      .setFooter({ text: 'Kliknij przycisk poniżej, aby wysłać zgłoszenie.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('start_sell')
        .setLabel('💰 Sprzedaj Przedmiot (Złóż Ofertę)')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // 2. Otwieranie Modala dla Gracza
  if (interaction.isButton() && interaction.customId === 'start_sell') {
    const modal = new ModalBuilder()
      .setCustomId('sell_modal')
      .setTitle('Formularz Sprzedaży Przedmiotu');

    const itemNameInput = new TextInputBuilder()
      .setCustomId('item_name')
      .setLabel('Nazwa przedmiotu')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('np. Słuchawki Apple V2')
      .setRequired(true);

    const marketValueInput = new TextInputBuilder()
      .setCustomId('market_value')
      .setLabel('Szacowana wartość rynkowa ($)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('np. 19000000')
      .setRequired(true);

    const expectedPriceInput = new TextInputBuilder()
      .setCustomId('expected_price')
      .setLabel('Ile Ty za to chcesz? ($)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('np. 12000000')
      .setRequired(true);

    const wikiLinkInput = new TextInputBuilder()
      .setCustomId('wiki_link')
      .setLabel('Link do Majestic Wiki (Opcjonalnie)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://wiki.majestic-rp.ru/...')
      .setRequired(false);

    const proofInput = new TextInputBuilder()
      .setCustomId('proof_link')
      .setLabel('Link do Zdjęcia (Ctrl+V Imgur/Discord)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://i.imgur.com/...')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(itemNameInput),
      new ActionRowBuilder().addComponents(marketValueInput),
      new ActionRowBuilder().addComponents(expectedPriceInput),
      new ActionRowBuilder().addComponents(wikiLinkInput),
      new ActionRowBuilder().addComponents(proofInput)
    );

    await interaction.showModal(modal);
  }

  // 3. Wysyłanie oferty od Gracza -> Idzie na Twój PRYWATNY KANAŁ
  if (interaction.isModalSubmit() && interaction.customId === 'sell_modal') {
    const itemName = interaction.fields.getTextInputValue('item_name');
    const marketValueRaw = interaction.fields.getTextInputValue('market_value').replace(/[^0-9]/g, '');
    const expectedPriceRaw = interaction.fields.getTextInputValue('expected_price').replace(/[^0-9]/g, '');
    const wikiLink = interaction.fields.getTextInputValue('wiki_link') || 'Brak linku do Wiki';
    const proofLink = interaction.fields.getTextInputValue('proof_link') || 'Brak wklejonego linku';

    const marketValue = parseInt(marketValueRaw) || 0;
    const expectedPrice = parseInt(expectedPriceRaw) || 0;

    const minBuy = Math.round(marketValue * 0.5);
    const maxBuy = Math.round(marketValue * 0.7);

    const offerEmbed = new EmbedBuilder()
      .setTitle(`📥 NOWA OFERTA: ${itemName}`)       .setColor(0x3498db)       .addFields(         { name: '👤 Sprzedający', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
        { name: '🆔 ID Discord Gracza', value: `\`${interaction.user.id}\``, inline: true },
        { name: '📦 Przedmiot', value: itemName, inline: false },
        { name: '💎 Rynkowa Wartość', value: `$${marketValue.toLocaleString()}`, inline: true },         { name: '💵 Chce dostać', value: `$${expectedPrice.toLocaleString()}`, inline: true },
        { name: '📊 Sugerowany Skup (50%-70%)', value: `\`$${minBuy.toLocaleString()} - $${maxBuy.toLocaleString()}\``, inline: false },
        { name: '🌐 Majestic Wiki', value: wikiLink !== 'Brak linku do Wiki' ? `[Kliknij, aby otworzyć Wiki](${wikiLink})` : 'Nie podano', inline: true },
        { name: '🖼️ Dowód / Screen', value: proofLink, inline: false }
      )
      .setFooter({ text: 'System Skupu • Wybierz decyzję poniżej' })
      .setTimestamp();

    const adminButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${interaction.user.id}_${itemName}_${expectedPrice}`)
        .setLabel('✅ Akceptuj')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`counter_${interaction.user.id}_${itemName}`)
        .setLabel('💬 Zaproponuj Cenę')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`reject_${interaction.user.id}_${itemName}`)
        .setLabel('❌ Odrzuć')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ 
      content: '✅ Twoja oferta została wysłana! Otrzymasz wiadomość na PW (od bota), gdy zostanie przeanalizowana.', 
      ephemeral: true 
    });

    // Pobranie i wysłanie na Twój prywatny kanał
    try {
      const privateChannel = await client.channels.fetch(PRIVATE_ADMIN_CHANNEL_ID);
      if (privateChannel) {
        await privateChannel.send({
          content: `🔔 **Nowa oferta od gracza ${interaction.user}!**`,
          embeds: [offerEmbed],
          components: [adminButtons]
        });
      }
    } catch (err) {
      console.error('Błąd wysyłania na prywatny kanał:', err);
    }
  }

  // 4. Obsługa Przycisków Akcji przez Zarząd
  if (interaction.isButton()) {
    const [action, userId, ...rest] = interaction.customId.split('_');

    // 4A. Akceptacja oferty
    if (action === 'accept') {
      const itemName = rest[0];
      const price = rest[1];

      try {
        const user = await client.users.fetch(userId);
        await user.send(
          `🎉 **Twoja oferta została AKCEPTOWANA!**\n\n` +
          `📦 **Przedmiot:** ${itemName}\n` +
          `💵 **Kwota:** $${parseInt(price).toLocaleString()}\n\n` +
          `Skontaktuj się z właścicielem skupu na serwerze/w grze, aby przekazać przedmiot i odebrać gotówkę!`
        );

        await interaction.reply({ content: `✅ Zaakceptowano ofertę gracza <@${userId}>. Bot wysłał mu PW!`, ephemeral: false });
      } catch (err) {
        await interaction.reply({ content: `⚠️ Zaakceptowano, ale gracz ma zablokowane PW!`, ephemeral: false });
      }
    }

    // 4B. Otwarcie modala do Kontroferty (Zaproponuj cenę)
    if (action === 'counter') {
      const itemName = rest[0];

      const modal = new ModalBuilder()
        .setCustomId(`submit_counter_${userId}_${itemName}`)
        .setTitle('Zaproponuj Własną Cenę');

      const counterPriceInput = new TextInputBuilder()
        .setCustomId('counter_price')
        .setLabel('Twoja Propozycja Kwoty ($)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('np. 10000000')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(counterPriceInput));
      await interaction.showModal(modal);
    }

    // 4C. Odrzucenie oferty
    if (action === 'reject') {
      const itemName = rest[0];

      try {
        const user = await client.users.fetch(userId);
        await user.send(
          `❌ **Twoja oferta została ODRZUCONA.**\n\n` +
          `📦 **Przedmiot:** ${itemName}\n` +
          `Aktualnie nie jesteśmy zainteresowani zakupem tego przedmiotu w podanej cenie.`
        );

        await interaction.reply({ content: `❌ Odrzucono ofertę gracza <@${userId}>. Bot wysłał PW!`, ephemeral: false });
      } catch (err) {
        await interaction.reply({ content: `⚠️ Odrzucono ofertę, ale gracz ma zablokowane PW!`, ephemeral: false });
      }
    }
  }

  // 5. Wysyłanie Kontroferty do Gracza na PW
  if (interaction.isModalSubmit() && interaction.customId.startsWith('submit_counter_')) {
    const [, , userId, itemName] = interaction.customId.split('_');
    const counterPriceRaw = interaction.fields.getTextInputValue('counter_price').replace(/[^0-9]/g, '');
    const counterPrice = parseInt(counterPriceRaw) || 0;

    try {
      const user = await client.users.fetch(userId);
      await user.send(
        `💬 **Właściciel skupu złożył KONTROFERTĘ!**\n\n` +
        `📦 **Przedmiot:** ${itemName}\n` +
        `💵 **Proponowana cena skupu:** $${counterPrice.toLocaleString()}\n\n` +
        `Jeśli zgadzasz się na tę kwotę, napisz w odpowiedzi na to PW lub skontaktuj się bezpośrednio z właścicielem skupu!`
      );

      await interaction.reply({ content: `💬 Wysyłano kontrofertę ($${counterPrice.toLocaleString()}) do gracza <@${userId}> na PW!`, ephemeral: false });
    } catch (err) {
      await interaction.reply({ content: `⚠️ Nie udało się wysłać kontroferty (gracz zablokował PW).`, ephemeral: false });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
