import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { ulid } from 'ulid';
import { Transaction, TransactionType } from './types/transaction.js';
import { pool } from './src/db.js'; // include .js extension
import { Update } from '@telegraf/types';
import { ServerResponse, IncomingMessage } from 'http';
import dayjs from 'dayjs';


// Load variables from .env file
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    throw new Error('🚫 BOT_TOKEN is missing in environment variables.');
}

const bot = new Telegraf(BOT_TOKEN);
export const botInstance = bot;
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
        const parts = ctx.message.text?.split(' ') ?? [];
        const amount = Number(parts[1]);
        const description = parts.slice(2).join(' ');
        const id = ulid();

        const createdAt = dayjs.unix(ctx.message.date)
            .locale('Asia/Jakarta')
            .format('YYYY-MM-DDTHH:mm:ssZ');

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
        const sentMessage = await ctx.reply('Saved !')
        setTimeout(() => {
            // delete the bot’s reply after 5 seconds
            ctx.deleteMessage(sentMessage.message_id).catch(() => {
                // ignore if it’s already gone or deletion is not permitted
            });
        }, 5000);

    }
})

bot.command('today', async (ctx) => {
    try {
        const client = await pool.connect();
        const today = new Date();
        today.setHours(7, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const query =   `
       SELECT id, type, amount, description, created_at
       FROM transactions
       WHERE created_at >= $1 AND created_at < $2
       ORDER BY created_at`
        const res = await client.query(
          query,
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

bot.command('week', async (ctx) => {
  try {
    const client = await pool.connect();

    // get all transactions from the start of the current week
    const res = await client.query(`
      SELECT id, type, amount, description, created_at
      FROM transactions
      WHERE date_trunc('week', created_at) = date_trunc('week', now())
      ORDER BY created_at
    `);

    client.release();

    const rows = res.rows;
    if (rows.length === 0) {
      return ctx.reply("😴 No transactions recorded this week.");
    }

    // format each row into a line of HTML
    const lines = rows.map(r => {
      const dt = new Date(r.created_at);
      const date = dt.toLocaleDateString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      }); // e.g. "07/14/2025"
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

    // sum up the week’s total
    const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalFormatted = formatter.format(total);

    // send back as HTML
    await ctx.replyWithHTML(
      `<b>📆 Transactions this week</b>\n` +
      lines.join('\n') +
      `\n\n<b>💰 Total:</b> <code>${totalFormatted}</code>`
    );
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Failed to retrieve this week's transactions.");
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
