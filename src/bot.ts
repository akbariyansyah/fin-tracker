import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionType } from './transaction';
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
    const splitted:string[] = ctx.message.text?.split(' ').slice()
    const amount:number = Number(splitted[1])
    const description:string = splitted[2]
    const transaction: Transaction = {
        ID: uuidv4(),
        Type: TransactionType.Out,
        Amount: amount,
        Description: description,
        Timestamp: new Date().toISOString()
    }
    console.log('This is out message :', ctx.message.text)
    console.log(transaction)
    ctx.reply('Saved !')
})


bot.launch();
console.log('🚀 Bot is running...');
