const fs = require('fs');
const axios = require('axios');
require('dotenv').config(); // Load API key from .env file

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/completions";

async function generateJavaCode(prompt) {
    try {
        const response = await axios.post(
            OPENAI_ENDPOINT,
            {
                model: "gpt-4",
                prompt: `Generate a Java file that ${prompt}. Include a class with a main method and comments explaining the code.`,
                max_tokens: 400,
                temperature: 0.7,
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error("Error generating Java code:", error);
        return null;
    }
}

async function saveJavaFile(prompt, fileName) {
    const javaCode = await generateJavaCode(prompt);
    if (javaCode) {
        fs.writeFileSync(fileName, javaCode);
        console.log(`Java file '${fileName}' created successfully.`);
    } else {
        console.log("Failed to generate Java code.");
    }
}

// Example usage:
const prompt = "sorts an array using quicksort";
saveJavaFile(prompt, "Quicksort.java");
