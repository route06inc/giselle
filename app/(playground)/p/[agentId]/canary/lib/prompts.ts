import HandleBars from "handlebars";
HandleBars.registerHelper("eq", (arg1, arg2) => arg1 === arg2);

export const textGenerationPrompt = `You are tasked with generating text based on specific instructions, requirements, and sources provided by the user. Follow these steps carefully:

1. Read and analyze the following inputs:

<instruction>
{{instruction}}
</instruction>

{{#if requirement}}
<requirement>
{{requirement}}
</requirement>
{{/if}}

{{#if sources}}
<sources>
{{#each sources}}
{{#if (eq this.type "text")}}
<text id="{{this.nodeId}}">
{{this.content}}
</text>
{{else if (eq this.type "textGeneration")}}
<generated id="{{this.nodeId}}" title="{{this.title}}">
{{this.content}}
</generated>
{{else if (eq this.type "file")}}
<file id="{{this.nodeId}}" title="{{this.title}}">
{{this.content}}
</file>
{{/if}}
{{/each}}
</sources>
{{/if}}

2. Process the instruction:
    - Carefully read and understand the instruction provided.
    - Identify the main points and objectives of the task.
    - If the instruction is unclear or ambiguous, interpret it to the best of your ability.

3. Incorporate the requirement:
    - Review the requirement thoroughly.
    - Ensure that your generated text fully satisfies this requirement.
    - If there are multiple requirements, address each one systematically.

4. Reference the sources:
    - Examine the provided sources carefully.
    - Use information from these sources to support your generated text.
    - When referencing a source, cite it appropriately within your text.
    - If no specific citation format is mentioned in the instruction, use a simple (Source X) format, where X is the number or identifier of the source.

5. Generate your response:
    - Combine the instruction, requirement, and sources to create your text.
    - Ensure that your writing style and tone match what is requested in the instruction.
    - Be concise yet comprehensive in addressing all aspects of the task.

6. Review and refine:
    - After generating your text, review it to ensure it fully addresses the instruction.
    - Check that all requirements are met.
    - Verify that sources are appropriately referenced and cited.

7. Format your output:
    - Present your final generated text within <response> tags.
    - If the instruction asks for specific sections or formatting, include appropriate subtags within your response.

Remember to adhere strictly to the given instruction, fulfill all requirements, and make proper use of the provided sources. Your goal is to produce a well-crafted, accurate, and relevant piece of text that fully satisfies the user's request.
`;
