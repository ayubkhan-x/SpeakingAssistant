import fetch from 'node-fetch';

async function getGptResponse(question) {
    const response = await fetch('https://api.openai.com/v1/engines/davinci/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: `Answer the following question: ${question}`,
            max_tokens: 150
        })
    });
    const data = await response.json();
    return data.choices[0].text.trim();
}

export default function setupGptCommands(bot) {
    bot.command('gpt', async (ctx) => {
        const question = ctx.message.text.replace('/gpt', '').trim();
        if (question) {
            const gptResponse = await getGptResponse(question);
            await ctx.replyWithMarkdown(`*Q: ${question}*\n*A: ${gptResponse}*`);
        } else {
            await ctx.reply('Please provide a question after the /gpt command.');
        }
    });
};