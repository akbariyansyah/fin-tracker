import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { ulid } from 'ulid';
import { Transaction, TransactionType } from '../types/transaction.js';
import { pool } from './db.js'; // include .js extension
import { Update } from '@telegraf/types';
import { ServerResponse, IncomingMessage } from 'http';

// Load variables from .env file
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    throw new Error('🚫 BOT_TOKEN is missing in environment variables.');
}

const bot = new Telegraf(BOT_TOKEN);
export const botInstance =bot;
const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0, // no cents for IDR
});


export const handleUpdate = async (update: Update, res: ServerResponse<IncomingMessage> | undefined) => {
  try {
    await bot.handleUpdate(update, res);
  } catch (err) {
    console.error('Error handling update', err);
  }
};

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

bot.command('month', async (ctx) => {
    try {
        const client = await pool.connect();

        const res = await client.query(
            `SELECT id, type, amount, description, created_at
                FROM transactions
                WHERE date_trunc('month', created_at) = date_trunc('month', now())
                ORDER BY created_at`
        );

        client.release();

        const rows = res.rows;
        if (rows.length === 0) {
            return ctx.reply("😴 No transactions recorded this month.");
        }


        const lines = rows.map(r => {
            const dt = new Date(r.created_at);
            const date = dt.toLocaleDateString('id-ID', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }); // e.g. "05/07/2025"
            const time = dt.toLocaleTimeString('id-ID', {
                hour: '2-digit', minute: '2-digit'
            }); // e.g. "14:30"
            const amount = formatter.format(Number(r.amount));
            const desc = r.description
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return `<b>${date}</b> ${time} • <i>${r.type.toUpperCase()}</i> • <code>${amount}</code> – ${desc}`;
        });

        const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
        const totalFormatted = formatter.format(total);

        await ctx.replyWithHTML(
            `<b>📅 Transactions this month</b>\n` +
            lines.join('\n') +
            `\n\n<b>💰 Total:</b> <code>${totalFormatted}</code>`
        );
    } catch (err) {
        console.error(err);
        ctx.reply("❌ Failed to retrieve this month's transactions.");
    }
});


bot.launch();
console.log('🚀 Bot is running...');
