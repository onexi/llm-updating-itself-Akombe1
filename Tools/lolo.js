const prompt = `Write a Javascript function to add two numbers together. 
Name the function "execute" and provide a "details" variable that conforms to the OpenAI schema. 
Here is an example of a function and details: 

const execute = async (num1, num2) => {
   return { result: num1 + num2 };
};

const details = {
   type: "function",
   function: {
       name: 'addNumbers',
       parameters: {
           type: 'object',
           properties: {
               num1: {
                   type: 'number',
                   description: 'First number to add'
               },
               num2: {
                   type: 'number',
                   description: 'Second number to add'
               }
           },
           required: ['num1', 'num2']
       },
   },
   description: 'This function adds two numbers and returns the result.'
};

export { execute, details };`;
