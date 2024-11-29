
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ 
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1'
});

async function main() {
    try {
        const completion = await openai.chat.completions.create({ 
            model: "meta/llama-3.2-3b-instruct",
            messages: [
                {
                    "role": "user",
                    "content": "Write a limerick about the wonders of GPU computing."
                }
            ],
            temperature: 0.2,
            top_p: 0.7,
            max_tokens: 1024,
            stream: true
        });

        for await (const chunk of completion) {
            process.stdout.write(chunk.choices[0]?.delta?.content || '');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();