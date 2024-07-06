const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();
const LocalSession = require('telegraf-session-local');
const part1Data = require('./data/part1');
const part2Data = require('./data/part2');
const part3Data = require('./data/part3');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Команда /getid
bot.command('getid', ctx => {
    const userId = ctx.from.id;
    ctx.reply(`Your user ID is: ${userId}`);
  });

// Используем сессии
bot.use((new LocalSession({ database: 'sessions.json' })).middleware());

const categories = {
    'Part 1': part1Data,
    'Part 2': part2Data,
    'Part 3': part3Data
};

const mainMenu = Markup.keyboard([
    ['Part 1', 'Part 2', 'Part 3']
]).resize();

bot.start((ctx) => ctx.reply('Welcome to IELTS Speaking Bot! Choose a part to practice:', mainMenu));

bot.hears(['Part 1', 'Part 2', 'Part 3'], (ctx) => {
    const part = ctx.message.text;
    ctx.session.part = part;
    ctx.session.data = categories[part];
    ctx.session.page = 0;
    ctx.replyWithMarkdown(`You selected ${part}. Choose a topic:`, {
        reply_markup: {
            inline_keyboard: topicMenu(ctx.session.data, ctx.session.page)
        }
    });
});

bot.command('admin', (ctx) => {
    if (ctx.from.id.toString() === process.env.FOUNDER_ID) {
        ctx.reply('Welcome to the Admin Panel. Send me a command:\n' +
            'To add a topic: `add part:topic`\n' +
            'To add a question: `add topic:question:answer`\n' +
            'To remove a topic: `remove part:topic`\n' +
            'To finish adding questions: `done`', { parse_mode: 'Markdown' });
    } else {
        ctx.reply('You do not have access to the Admin Panel.');
    }
});

bot.on('text', async (ctx) => {
    const message = ctx.message.text;

    if (ctx.from.id.toString() === process.env.FOUNDER_ID) {
        if (message.startsWith('add ')) {
            const command = message.slice(4);
            const parts = command.split(':');

            if (parts.length === 2) {
                // Добавление новой темы
                const [part, topic] = parts;
                if (categories[part]) {
                    categories[part].push({ topic, questions: [] });
                    ctx.reply(`Topic "${topic}" added to ${part}. Now send questions in the format: topic:question:answer`);
                    ctx.session.awaitingQuestion = true;
                    ctx.session.currentTopic = topic;
                } else {
                    ctx.reply('Invalid part.');
                }
            } else if (parts.length === 3) {
                // Добавление вопросов и ответов
                const [topic, question, answer] = parts;
                let topicFound = false;

                for (let part in categories) {
                    const topicObj = categories[part].find(t => t.topic === topic);
                    if (topicObj) {
                        topicObj.questions.push({ question, answer });
                        ctx.reply(`Question added to topic "${topic}". You can add more questions or type "done" to finish.`);
                        topicFound = true;
                        break;
                    }
                }

                if (!topicFound) {
                    ctx.reply('Invalid topic.');
                }
            } else {
                ctx.reply('Invalid format. Use: add part:topic or add topic:question:answer');
            }
        } else if (message.startsWith('remove ')) {
            const command = message.slice(7);
            const [part, topic] = command.split(':');

            if (categories[part]) {
                categories[part] = categories[part].filter(t => t.topic !== topic);
                ctx.reply(`Topic "${topic}" removed from ${part}.`);
            } else {
                ctx.reply('Invalid part.');
            }
        } else if (message.toLowerCase() === 'done') {
            ctx.reply('You have finished adding questions.');
            ctx.session.awaitingQuestion = false;
            ctx.session.currentTopic = null;
        }
    }
});

bot.action(/topic:(\d+)/, async (ctx) => {
    ctx.answerCbQuery();
    const index = Number(ctx.match[1]);
    const topic = ctx.session.data[index];
    ctx.session.index = index;
    await ctx.editMessageText(`*Topic: ${topic.topic}*\n\nQuestions:`, {
        reply_markup: {
            inline_keyboard: questionMenu(topic.questions)
        },
        parse_mode: 'Markdown'
    });
});

bot.action(/question:(\d+)/, async (ctx) => {
    ctx.answerCbQuery();
    const questionIndex = Number(ctx.match[1]);
    const question = ctx.session.data[ctx.session.index].questions[questionIndex];
    await ctx.replyWithMarkdown(`*Q: ${question.question}*\n*A: ${question.answer}*`, {
        reply_markup: {
            inline_keyboard: backToQuestionsMenu()
        },
        parse_mode: 'Markdown'
    });
});

bot.action('back', async (ctx) => {
    ctx.answerCbQuery();
    const topic = ctx.session.data[ctx.session.index];
    await ctx.editMessageText(`*Topic: ${topic.topic}*\n\nQuestions:`, {
        reply_markup: {
            inline_keyboard: questionMenu(topic.questions)
        },
        parse_mode: 'Markdown'
    });
});

bot.action('backToTopics', async (ctx) => {
    ctx.answerCbQuery();
    ctx.session.page = 0;
    await ctx.editMessageText('Choose a topic:', {
        reply_markup: {
            inline_keyboard: topicMenu(ctx.session.data, ctx.session.page)
        },
        parse_mode: 'Markdown'
    });
});

bot.action('nextPage', async (ctx) => {
    ctx.answerCbQuery();
    const data = ctx.session.data;
    const currentPage = ctx.session.page || 0;
    const maxPages = Math.ceil(data.length / 5);
    if (currentPage < maxPages - 1) {
        ctx.session.page = currentPage + 1;
        await ctx.editMessageText('Choose a topic:', {
            reply_markup: {
                inline_keyboard: topicMenu(data, ctx.session.page)
            },
            parse_mode: 'Markdown'
        });
    }
});

bot.action('prevPage', async (ctx) => {
    ctx.answerCbQuery();
    const currentPage = ctx.session.page || 0;
    if (currentPage > 0) {
        ctx.session.page = currentPage - 1;
        await ctx.editMessageText('Choose a topic:', {
            reply_markup: {
                inline_keyboard: topicMenu(ctx.session.data, ctx.session.page)
            },
            parse_mode: 'Markdown'
        });
    }
});

const topicMenu = (data, page) => {
    const startIndex = page * 5;
    const topicsToShow = data.slice(startIndex, startIndex + 5);
    const buttons = topicsToShow.map((topic, index) => ([{
        text: topic.topic,
        callback_data: `topic:${startIndex + index}`
    }]));

    const navButtons = [];
    if (page > 0) navButtons.push({ text: '◀️ Previous', callback_data: 'prevPage' });
    if (page < Math.ceil(data.length / 5) - 1) navButtons.push({ text: 'Next ▶️', callback_data: 'nextPage' });

    if (navButtons.length) buttons.push(navButtons);

    return buttons;
};

const questionMenu = (questions) => {
    const buttons = questions.map((q, index) => ([{
        text: q.question,
        callback_data: `question:${index}`
    }]));
    buttons.push([{ text: 'Back to Topics', callback_data: 'backToTopics' }]);
    return buttons;
};

const backToQuestionsMenu = () => ([[{
    text: 'Back',
    callback_data: 'back'
}]]);

bot.launch();

console.log('Bot is running...');
