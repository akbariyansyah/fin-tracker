import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { ulid } from 'ulid';
import { Transaction, TransactionType } from './transaction.js';
import { pool } from './db.js'; // include .js extension

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


bot.command('out', async (ctx) => {
    try {
        const splitted: string[] = ctx.message.text?.split(' ').slice()
        const amount: number = Number(splitted[1])
        const description: string = splitted[2]
        const id = ulid();
        const createdAt = new Date().toISOString();
        const transaction: Transaction = {
            ID: id,
            Type: TransactionType.Out,
            Amount: amount,
            Description: description,
            CreatedAt: createdAt
        }
        console.log('This is out message :', ctx.message.text)
        console.log(transaction)
        const query = `
            INSERT INTO transactions (id, type, amount, description, created_at)
            VALUES ($1, $2, $3, $4, $5)
            `;

        await pool.query(query, [
            id,
            TransactionType.Out,
            amount,
            description,
            createdAt,
        ]);
    } catch (err) {
        console.log("error happen", err)
    } finally {
        console.log('Success');
        ctx.reply('Saved !')
    }
})

bot.command('today', async (ctx) => {
    try {
        const client = await pool.connect();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const res = await client.query(
            `SELECT id, type, amount, description, created_at
       FROM transactions
       WHERE created_at >= $1 AND created_at < $2
       ORDER BY created_at`,
            [today.toISOString(), tomorrow.toISOString()]
        );
        client.release();

        const rows = res.rows;
        if (rows.length === 0) {
            return ctx.reply("😴 No transactions recorded today.");
        }

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0, // no cents for IDR
        });


        const lines = rows.map(r => {
            const time = new Date(r.created_at)
                .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const amount = formatter.format(Number(r.amount));

            return `${time} • ${r.type.toUpperCase()} • ${amount} – ${r.description}`;
        });

        let total = rows.reduce((sum, r) => sum + Number(r.amount), 0);

        total = formatter.format(Number(total))
        await ctx.reply(lines.join("\n") + `\n\n💰 Total today: ${total}`);
    } catch (err) {
        console.error(err);
        ctx.reply("❌ Error retrieving today's transactions.");
    }
});

bot.launch();
console.log('🚀 Bot is running...');
