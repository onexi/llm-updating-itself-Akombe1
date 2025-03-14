import dotenv from 'dotenv';
import OpenAI from "openai";
import fs from 'fs';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Load tools dynamically

const loadTools = async () => {
    const tools = {};
    const toolFiles = fs.readdirSync('./Tools/').filter(file => file.endsWith('.js'));

    console.log("🔍 Tool files found:", toolFiles); // Debugging output

    for (const file of toolFiles) {
        try {
            const module = await import(`./Tools/${file}`);
            console.log(`✅ Loaded function: ${module.details.function.name}`); // Debugging output
            tools[module.details.function.name] = module.execute;
        } catch (err) {
            console.error(`❌ Error loading ${file}:`, err);
        }
    }

    console.log("📌 Final tools object:", tools);
    return tools;
};

const tools = await loadTools();


const handleGPTRequest = async (functionName, args) => {
    if (tools[functionName]) {
        return await tools[functionName](...args);
    } else {
        throw new Error("Function not found.");
    }
};

// Example call
(async () => {
    const result = await handleGPTRequest('multiplyNumbers', [5, 3]);
    console.log(result); // { result: 15 }
})();
