import fs from 'fs';

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
