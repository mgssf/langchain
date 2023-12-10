"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaFunctions = void 0;
const base_js_1 = require("../../chat_models/base.cjs");
const index_js_1 = require("../../schema/index.cjs");
const ollama_js_1 = require("../../chat_models/ollama.cjs");
const chat_js_1 = require("../../prompts/chat.cjs");
const DEFAULT_TOOL_SYSTEM_TEMPLATE = `You have access to the following tools:
{tools}
You must always select one of the above tools and respond with only a JSON object matching the following schema:
{{
  "tool": <name of the selected tool>,
  "tool_input": <parameters for the selected tool, matching the tool's JSON schema>
}}`;
class OllamaFunctions extends base_js_1.BaseChatModel {
    static lc_name() {
        return "OllamaFunctions";
    }
    constructor(fields) {
        super(fields ?? {});
        Object.defineProperty(this, "llm", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "toolSystemPromptTemplate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: DEFAULT_TOOL_SYSTEM_TEMPLATE
        });
        Object.defineProperty(this, "defaultResponseFunction", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                name: "__conversational_response",
                description: "Respond conversationally if no other tools should be called for a given query.",
                parameters: {
                    type: "object",
                    properties: {
                        response: {
                            type: "string",
                            description: "Conversational response to the user.",
                        },
                    },
                    required: ["response"],
                },
            }
        });
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain", "experimental", "chat_models"]
        });
        this.llm = fields?.llm ?? new ollama_js_1.ChatOllama({ ...fields, format: "json" });
        this.toolSystemPromptTemplate =
            fields?.toolSystemPromptTemplate ?? this.toolSystemPromptTemplate;
    }
    invocationParams() {
        return this.llm.invocationParams();
    }
    /** @ignore */
    _identifyingParams() {
        return this.llm._identifyingParams();
    }
    async _generate(messages, options, runManager) {
        let functions = options.functions ?? [];
        if (options.function_call !== undefined) {
            functions = functions.filter((fn) => fn.name === options.function_call?.name);
            if (!functions.length) {
                throw new Error(`If "function_call" is specified, you must also pass a matching function in "functions".`);
            }
        }
        else if (functions.length === 0) {
            functions.push(this.defaultResponseFunction);
        }
        const systemPromptTemplate = chat_js_1.SystemMessagePromptTemplate.fromTemplate(this.toolSystemPromptTemplate);
        const systemMessage = await systemPromptTemplate.format({
            tools: JSON.stringify(functions, null, 2),
        });
        const chatResult = await this.llm._generate([systemMessage, ...messages], options, runManager);
        const chatGenerationContent = chatResult.generations[0].message.content;
        if (typeof chatGenerationContent !== "string") {
            throw new Error("OllamaFunctions does not support non-string output.");
        }
        let parsedChatResult;
        try {
            parsedChatResult = JSON.parse(chatGenerationContent);
        }
        catch (e) {
            throw new Error(`"${this.llm.model}" did not respond with valid JSON. Please try again.`);
        }
        const calledToolName = parsedChatResult.tool;
        const calledToolArguments = parsedChatResult.tool_input;
        const calledTool = functions.find((fn) => fn.name === calledToolName);
        if (calledTool === undefined) {
            throw new Error(`Failed to parse a function call from ${this.llm.model} output: ${chatGenerationContent}`);
        }
        if (calledTool.name === this.defaultResponseFunction.name) {
            return {
                generations: [
                    {
                        message: new index_js_1.AIMessage({
                            content: calledToolArguments.response,
                        }),
                        text: calledToolArguments.response,
                    },
                ],
            };
        }
        const responseMessageWithFunctions = new index_js_1.AIMessage({
            content: "",
            additional_kwargs: {
                function_call: {
                    name: calledToolName,
                    arguments: calledToolArguments
                        ? JSON.stringify(calledToolArguments)
                        : "",
                },
            },
        });
        return {
            generations: [{ message: responseMessageWithFunctions, text: "" }],
        };
    }
    _llmType() {
        return "ollama_functions";
    }
    /** @ignore */
    _combineLLMOutput() {
        return [];
    }
}
exports.OllamaFunctions = OllamaFunctions;
