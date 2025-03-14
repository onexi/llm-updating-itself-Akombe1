import express from 'express';
import bodyParser from 'body-parser';
import { OpenAI} from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from "fs";
import dotenv from 'dotenv';

// Define the directory name
const directoryName = "tools";

// Get the current working directory
const currentDirectory = process.cwd();

// Define the full path of the new directory
const directoryPath = path.join(currentDirectory, directoryName);

// Check if the directory exists
if (!fs.existsSync(directoryPath)) {
    // Attempt to create the directory
    try {
        fs.mkdirSync(directoryPath);
        console.log(`✅ Directory created successfully: ${directoryPath}`);
    } catch (error) {
        console.error(`❌ Failed to create directory: ${error.message}`);
    }
} else {
    console.log(`⚠️ Directory already exists: ${directoryPath}`);
}


// Initialize Express server
const app = express();
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.resolve(process.cwd(), './public')));
dotenv.config();

// OpenAI API configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
let state = {
    chatgpt:false,
    assistant_id: "",
    assistant_name: "",
    dir_path: "",
    news_path: "",
    thread_id: "",
    user_message: "",
    run_id: "",
    run_status: "",
    vector_store_id: "",
    tools:[],
    parameters: []
  };
// Default route to serve index.html for any undefined routes
app.get('*', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), './public/index.html'));
});

async function getFunctions() {
    const functionsDir = path.resolve(process.cwd(), "./functions");
    
    // Ensure the functions directory exists
    if (!fs.existsSync(functionsDir)) {
        fs.mkdirSync(functionsDir, { recursive: true });
    }

    const files = fs.readdirSync(functionsDir);
    const openAIFunctions = {};

    for (const file of files) {
        if (file.endsWith(".js")) { 
            const moduleName = file.slice(0, -3);
            const modulePath = `./functions/${moduleName}.js`;
            
            try {
                const { details, execute } = await import(modulePath);
                openAIFunctions[moduleName] = { details, execute };
            } catch (error) {
                console.error(`❌ Failed to load function ${moduleName}: ${error.message}`);
            }
        }
    }
    
    return openAIFunctions;
}

// Function to check if a tool exists, otherwise create it dynamically
async function ensureFunctionExists(functionName) {
    const functions = await getFunctions();

    if (functions[functionName]) {
        console.log(`✅ Function "${functionName}" exists.`);
        return true;
    }

    console.log(`⚠️ Function "${functionName}" not found. Generating tool...`);
    createNewTool(functionName);
    return false;
}

// Function to create a new tool dynamically
function createNewTool(functionName) {
    const toolCode = `
export const details = {
    name: "${functionName}",
    description: "Dynamically generated tool for ${functionName}.",
    parameters: {
        type: "object",
        properties: {
            input: { type: "string", description: "Input parameter for the tool." }
        },
        required: ["input"]
    }
};

export async function execute(input) {
    return { message: "Generated tool '${functionName}' executed with input: " + input };
}
    `.trim();

    const toolPath = path.resolve(process.cwd(), `./functions/${functionName}.js`);

    try {
        fs.writeFileSync(toolPath, toolCode);
        console.log(`✅ New tool "${functionName}" created at ${toolPath}`);
    } catch (error) {
        console.error(`❌ Failed to create tool "${functionName}": ${error.message}`);
    }
}
r 

// Route to interact with OpenAI API
app.post('/api/execute-function', async (req, res) => {
    const { functionName, parameters } = req.body;

    // Import all functions
    const functions = await getFunctions();

    if (!functions[functionName]) {
        return res.status(404).json({ error: 'Function not found' });
    }

    try {
        // Call the function
        const result = await functions[functionName].execute(...Object.values(parameters));
        console.log(`result: ${JSON.stringify(result)}`);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Function execution failed', details: err.message });
    }
});

// Example to interact with OpenAI API and get function descriptions
app.post('/api/openai-call', async (req, res) => {
    console.log("🔵 Received request to /api/openai-call");
    
    const { user_message } = req.body;
    console.log(`📨 User message: ${user_message}`);

    const functions = await getFunctions();
    console.log(`🔍 Loaded functions: ${Object.keys(functions)}`);

    const availableFunctions = Object.values(functions).map(fn => fn.details);
    console.log(`🛠 Available functions: ${JSON.stringify(availableFunctions)}`);

    let messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: user_message }
    ];

    try {
        console.log("📡 Calling OpenAI API...");

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            tools: availableFunctions
        });

        console.log("✅ OpenAI API Response received:", JSON.stringify(response, null, 2));

        if (!response.choices || response.choices.length === 0) {
            console.error("❌ OpenAI response has no choices.");
            return res.status(500).json({ error: "OpenAI response has no choices." });
        }

        const toolCall = response.choices[0]?.message?.tool_calls?.[0];

        if (!toolCall) {
            console.log("⚠️ No function call detected.");
            return res.json({ message: 'No function call detected.' });
        }

        const functionName = toolCall.function?.name;
        console.log(`🛠 Function call detected: ${functionName}`);

        if (!functionName || !functions[functionName]) {
            console.error(`❌ Function "${functionName}" not found.`);
            return res.status(500).json({ error: `Function "${functionName}" not found.` });
        }

        const parameters = JSON.parse(toolCall.function.arguments);
        console.log(`📨 Function parameters: ${JSON.stringify(parameters)}`);

        const result = await functions[functionName].execute(...Object.values(parameters));
        console.log(`✅ Function execution result: ${JSON.stringify(result)}`);

        const function_call_result_message = {
            role: "tool",
            content: JSON.stringify({ result: result }),
            tool_call_id: toolCall.id
        };

        messages.push(response.choices[0].message);
        messages.push(function_call_result_message);

        const final_response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages
        });

        console.log("✅ Final OpenAI Response:", JSON.stringify(final_response, null, 2));

        let output = final_response.choices[0].message.content;
        res.json({ message: output, state: state });

    } catch (error) {
        console.error("🚨 OpenAI API failed:", error);
        res.status(500).json({ error: 'OpenAI API failed', details: error.message });
    }
});

app.post('/api/prompt', async (req, res) => {
    // just update the state with the new prompt
    state = req.body;
    try {
        res.status(200).json({ message: `got prompt ${state.user_message}`, "state": state });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'User Message Failed', "state": state });
    }
});
// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
