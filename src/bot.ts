import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

// Load variables from .env file
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('🚫 BOT_TOKEN is missing in environment variables.');
}

const bot = new Telegraf(BOT_TOKEN);

// Respond to /start
bot.start((ctx) => {
  ctx.reply(`Hello, ${ctx.from.first_name}! I am your bot 🤖`);
});

// Simple text reply
bot.hears('hi', (ctx) => {
  ctx.reply('Hey there!');
});

bot.command('out', (ctx) => {
    console.log('This is out message :', ctx.message.text)
    ctx.reply('Saved !')
})
// Echo command
bot.command('echo', (ctx) => {
  const input = ctx.message.text?.split(' ').slice(1).join(' ');
  ctx.reply(input || 'You didn’t say anything to echo!');
});

bot.launch();
console.log('🚀 Bot is running...');
