// HC Stock Exchange Bot - simple JSON-backed Discord bot
// WARNING: This file contains your bot token embedded as requested. Treat this ZIP as sensitive.
// To run: npm install && node index.js
const fs = require('fs');
const path = require('path');
const { Client, IntentsBitField, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// ---------- CONFIG (EDIT IF NEEDED) ----------
// Token inserted as requested
const TOKEN = "MTQyODk4MjEzMzQ2MDA0NTg4NA.G1CqC3.BxuZLvIkpk98Zqy3YiM-jN6liH2-bD8R-twD0k";

const DATA_FILE = path.join(__dirname, 'db.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Load or init DB
function loadDB(){
  if(!fs.existsSync(DATA_FILE)){
    fs.writeFileSync(DATA_FILE, JSON.stringify({ players: {}, fantasy: {}, meta: { created: Date.now() } }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}
function saveDB(db){
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// Helpers
function calcPlayerValue(p){
  // Simple formula: base on runs, wickets, strikeRate, economy, fantasy points
  const runs = Number(p.runs||0);
  const wickets = Number(p.wickets||0);
  const strikeRate = Number(p.strikeRate||0);
  const economy = Number(p.economy||0);
  const fantasy = Number(p.fantasy||0);
  let val = runs*5 + wickets*250 + strikeRate*4 - economy*30 + fantasy*200;
  if(val < 100) val = Math.max(100, Math.floor(val));
  return Math.round(val);
}

function ensurePlayer(db, name){
  if(!db.players[name]){
    db.players[name] = { name, runs:0, balls:0, wickets:0, overs:0, economy:0, strikeRate:0, fantasy:0, updated: Date.now() };
  }
  return db.players[name];
}

// Create client
const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log('HC Stock Exchange Bot is online as', client.user.tag);
});

client.on('messageCreate', async message => {
  if(message.author.bot) return;

  const db = loadDB();
  const prefix = '!';
  if(!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  // Basic commands
  if(cmd === 'ping'){
    return message.reply('Pong!');
  }

  // Add player: !addplayer name runs wickets balls overs economy strikeRate fantasy
  if(cmd === 'addplayer'){
    const name = args.shift();
    if(!name) return message.reply('Usage: !addplayer <name> [runs] [wickets] [balls] [overs] [economy] [strikeRate] [fantasy]');
    const p = ensurePlayer(db, name);
    p.runs = Number(args.shift()||p.runs);
    p.wickets = Number(args.shift()||p.wickets);
    p.balls = Number(args.shift()||p.balls);
    p.overs = Number(args.shift()||p.overs);
    p.economy = Number(args.shift()||p.economy);
    p.strikeRate = Number(args.shift()||p.strikeRate);
    p.fantasy = Number(args.shift()||p.fantasy);
    p.updated = Date.now();
    saveDB(db);
    return message.reply(`Player **${name}** added/updated. Current value: ₹${calcPlayerValue(p)}`);
  }

  // Edit player field: !editplayer name field value
  if(cmd === 'editplayer'){
    const name = args.shift();
    const field = args.shift();
    const value = args.shift();
    if(!name || !field || value===undefined) return message.reply('Usage: !editplayer <name> <field> <value>');
    const p = db.players[name];
    if(!p) return message.reply('Player not found.');
    if(!(field in p)) return message.reply('Invalid field. Allowed: runs,wickets,balls,overs,economy,strikeRate,fantasy');
    p[field] = isNaN(Number(value)) ? value : Number(value);
    p.updated = Date.now();
    saveDB(db);
    return message.reply(`Player **${name}** updated. ${field} = ${p[field]}. New value: ₹${calcPlayerValue(p)}`);
  }

  // Show value: !value name
  if(cmd === 'value'){
    const name = args.shift();
    if(!name) return message.reply('Usage: !value <name>');
    const p = db.players[name];
    if(!p) return message.reply('Player not found.');
    const val = calcPlayerValue(p);
    const embed = {
      title: `Value — ${p.name}`,
      fields: [
        { name: 'Runs', value: String(p.runs), inline: true },
        { name: 'Wickets', value: String(p.wickets), inline: true },
        { name: 'Strike Rate', value: String(p.strikeRate), inline: true },
        { name: 'Economy', value: String(p.economy), inline: true },
        { name: 'Fantasy', value: String(p.fantasy), inline: true },
        { name: 'Market Value', value: `₹${val}`, inline: true }
      ],
      timestamp: new Date().toISOString()
    };
    return message.reply({ embeds: [embed] });
  }

  // List players: !listplayers
  if(cmd === 'listplayers'){
    const players = Object.values(db.players || {}).slice(0,50);
    if(players.length === 0) return message.reply('No players in database.');
    const lines = players.map(p => `${p.name} — ₹${calcPlayerValue(p)} (runs:${p.runs} wkts:${p.wickets})`);
    // chunk if long
    return message.reply('Players:\n' + lines.join('\n'));
  }

  // Owner panel (requires ManageGuild permission)
  if(cmd === 'owner'){
    if(!message.member.permissions.has('ManageGuild')) return message.reply('You need Manage Server permission to use owner panel.');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('owner_list').setLabel('List Players').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('owner_add').setLabel('Add Random Test Player').setStyle(ButtonStyle.Success)
    );
    return message.reply({ content: 'Owner Panel — quick actions', components: [row] });
  }
});

// Button interactions for owner panel
client.on('interactionCreate', async interaction => {
  if(!interaction.isButton()) return;
  const db = loadDB();
  if(interaction.customId === 'owner_list'){
    const players = Object.values(db.players || {});
    if(players.length === 0) return interaction.reply({ content: 'No players', ephemeral: true });
    const lines = players.map(p => `${p.name} — ₹${calcPlayerValue(p)} (runs:${p.runs} wkts:${p.wickets})`).slice(0,50);
    return interaction.reply({ content: lines.join('\n'), ephemeral: true });
  }
  if(interaction.customId === 'owner_add'){
    const name = 'Player' + Math.floor(Math.random()*10000);
    const p = ensurePlayer(db, name);
    p.runs = Math.floor(Math.random()*2000);
    p.wickets = Math.floor(Math.random()*200);
    p.strikeRate = Math.floor(40 + Math.random()*120);
    p.economy = Math.floor(3 + Math.random()*10);
    p.fantasy = Math.floor(Math.random()*500);
    p.updated = Date.now();
    saveDB(db);
    return interaction.reply({ content: `Added ${name} — ₹${calcPlayerValue(p)}`, ephemeral: true });
  }
});

// Simple autosave cron to ensure at-least-2-year retention info in meta (we rely on filesystem retention on host)
setInterval(()=>{
  const db = loadDB();
  db.meta = db.meta || {};
  db.meta.lastHeartbeat = Date.now();
  saveDB(db);
}, 1000*60*10); // every 10 minutes

client.login(TOKEN);
