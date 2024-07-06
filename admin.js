const { Markup } = require('telegraf');
const categories = require('./data/categories');

const adminPanelMenu = () => Markup.inlineKeyboard([
    [{ text: 'Add Topic', callback_data: 'addTopic' }],
    [{ text: 'Remove Topic', callback_data: 'removeTopic' }],
    [{ text: 'Add Question', callback_data: 'addQuestion' }]
]).resize();

export default function setupAdminCommands(bot) {
    bot.command('admin', (ctx) => {
        if (ctx.from.id.toString() === process.env.ADMIN_ID) {
            ctx.reply('Welcome to Admin Panel', adminPanelMenu());
        } else {
            ctx.reply('You do not have access to this panel.');
        }
    });

    bot.action('addTopic', async (ctx) => {
        ctx.answerCbQuery();
        ctx.session.adminAction = 'addTopic';
        await ctx.reply('Please enter the part (Part 1, Part 2, Part 3) and the topic:');
    });

    bot.action('removeTopic', async (ctx) => {
        ctx.answerCbQuery();
        ctx.session.adminAction = 'removeTopic';
        await ctx.reply('Please enter the part and the topic index to remove (e.g., Part 1 2):');
    });

    bot.action('addQuestion', async (ctx) => {
        ctx.answerCbQuery();
        ctx.session.adminAction = 'addQuestion';
        await ctx.reply('Please enter the part, topic index, and the question:');
    });

    bot.on('text', async (ctx) => {
        if (ctx.session.adminAction === 'addTopic') {
            const [part, ...topicArray] = ctx.message.text.split(' ');
            const topic = topicArray.join(' ');
            if (categories[part]) {
                categories[part].push({ topic, questions: [] });
                ctx.reply(`Added topic "${topic}" to ${part}.`);
            } else {
                ctx.reply('Invalid part. Please enter Part 1, Part 2, or Part 3.');
            }
            ctx.session.adminAction = null;
        } else if (ctx.session.adminAction === 'removeTopic') {
            const [part, index] = ctx.message.text.split(' ');
            if (categories[part] && categories[part][index]) {
                categories[part].splice(index, 1);
                ctx.reply(`Removed topic at index ${index} from ${part}.`);
            } else {
                ctx.reply('Invalid part or index.');
            }
            ctx.session.adminAction = null;
        } else if (ctx.session.adminAction === 'addQuestion') {
            const [part, index, ...questionArray] = ctx.message.text.split(' ');
            const question = questionArray.join(' ');
            if (categories[part] && categories[part][index]) {
                categories[part][index].questions.push({ question, answer: '' });
                ctx.reply(`Added question "${question}" to topic "${categories[part][index].topic}" in ${part}.`);
            } else {
                ctx.reply('Invalid part or index.');
            }
            ctx.session.adminAction = null;
        }
    });
};