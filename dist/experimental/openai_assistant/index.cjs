"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIAssistantRunnable = void 0;
const openai_1 = require("openai");
const base_js_1 = require("../../schema/runnable/base.cjs");
const time_js_1 = require("../../util/time.cjs");
const base_js_2 = require("../../tools/base.cjs");
const convert_to_openai_js_1 = require("../../tools/convert_to_openai.cjs");
class OpenAIAssistantRunnable extends base_js_1.Runnable {
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain", "experimental", "openai_assistant"]
        });
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "assistantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "pollIntervalMs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1000
        });
        Object.defineProperty(this, "asAgent", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.client = fields.client ?? new openai_1.OpenAI(fields?.clientOptions);
        this.assistantId = fields.assistantId;
        this.asAgent = fields.asAgent ?? this.asAgent;
    }
    static async createAssistant({ model, name, instructions, tools, client, clientOptions, asAgent, pollIntervalMs, fileIds, }) {
        const formattedTools = tools?.map((tool) => {
            // eslint-disable-next-line no-instanceof/no-instanceof
            if (tool instanceof base_js_2.StructuredTool) {
                return (0, convert_to_openai_js_1.formatToOpenAIAssistantTool)(tool);
            }
            return tool;
        }) ?? [];
        const oaiClient = client ?? new openai_1.OpenAI(clientOptions);
        const assistant = await oaiClient.beta.assistants.create({
            name,
            instructions,
            tools: formattedTools,
            model,
            file_ids: fileIds,
        });
        return new this({
            client: oaiClient,
            assistantId: assistant.id,
            asAgent,
            pollIntervalMs,
        });
    }
    async invoke(input, _options) {
        let run;
        if (this.asAgent && input.steps && input.steps.length > 0) {
            const parsedStepsInput = await this._parseStepsInput(input);
            run = await this.client.beta.threads.runs.submitToolOutputs(parsedStepsInput.threadId, parsedStepsInput.runId, {
                tool_outputs: parsedStepsInput.toolOutputs,
            });
        }
        else if (!("threadId" in input)) {
            const thread = {
                messages: [
                    {
                        role: "user",
                        content: input.content,
                        file_ids: input.fileIds,
                        metadata: input.messagesMetadata,
                    },
                ],
                metadata: input.threadMetadata,
            };
            run = await this._createThreadAndRun({
                ...input,
                thread,
            });
        }
        else if (!("runId" in input)) {
            await this.client.beta.threads.messages.create(input.threadId, {
                content: input.content,
                role: "user",
                file_ids: input.file_ids,
                metadata: input.messagesMetadata,
            });
            run = await this._createRun(input);
        }
        else {
            // Submitting tool outputs to an existing run, outside the AgentExecutor
            // framework.
            run = await this.client.beta.threads.runs.submitToolOutputs(input.runId, input.threadId, {
                tool_outputs: input.toolOutputs,
            });
        }
        return this._getResponse(run.id, run.thread_id);
    }
    /**
     * Delete an assistant.
     *
     * @link {https://platform.openai.com/docs/api-reference/assistants/deleteAssistant}
     * @returns {Promise<AssistantDeleted>}
     */
    async deleteAssistant() {
        return await this.client.beta.assistants.del(this.assistantId);
    }
    /**
     * Retrieves an assistant.
     *
     * @link {https://platform.openai.com/docs/api-reference/assistants/getAssistant}
     * @returns {Promise<OpenAIClient.Beta.Assistants.Assistant>}
     */
    async getAssistant() {
        return await this.client.beta.assistants.retrieve(this.assistantId);
    }
    /**
     * Modifies an assistant.
     *
     * @link {https://platform.openai.com/docs/api-reference/assistants/modifyAssistant}
     * @returns {Promise<OpenAIClient.Beta.Assistants.Assistant>}
     */
    async modifyAssistant({ model, name, instructions, fileIds, }) {
        return await this.client.beta.assistants.update(this.assistantId, {
            name,
            instructions,
            model,
            file_ids: fileIds,
        });
    }
    async _parseStepsInput(input) {
        const { action: { runId, threadId }, } = input.steps[input.steps.length - 1];
        const run = await this._waitForRun(runId, threadId);
        const toolCalls = run.required_action?.submit_tool_outputs.tool_calls;
        if (!toolCalls) {
            return input;
        }
        const toolOutputs = toolCalls.flatMap((toolCall) => {
            const matchedAction = input.steps.find((step) => step.action.toolCallId === toolCall.id);
            return matchedAction
                ? [
                    {
                        output: matchedAction.observation,
                        tool_call_id: matchedAction.action.toolCallId,
                    },
                ]
                : [];
        });
        return { toolOutputs, runId, threadId };
    }
    async _createRun({ instructions, model, tools, metadata, threadId, }) {
        const run = this.client.beta.threads.runs.create(threadId, {
            assistant_id: this.assistantId,
            instructions,
            model,
            tools,
            metadata,
        });
        return run;
    }
    async _createThreadAndRun(input) {
        const params = [
            "instructions",
            "model",
            "tools",
            "run_metadata",
        ]
            .filter((key) => key in input)
            .reduce((obj, key) => {
            const newObj = obj;
            newObj[key] = input[key];
            return newObj;
        }, {});
        const run = this.client.beta.threads.createAndRun({
            ...params,
            thread: input.thread,
            assistant_id: this.assistantId,
        });
        return run;
    }
    async _waitForRun(runId, threadId) {
        let inProgress = true;
        let run = {};
        while (inProgress) {
            run = await this.client.beta.threads.runs.retrieve(threadId, runId);
            inProgress = ["in_progress", "queued"].includes(run.status);
            if (inProgress) {
                await (0, time_js_1.sleep)(this.pollIntervalMs);
            }
        }
        return run;
    }
    async _getResponse(runId, threadId) {
        const run = await this._waitForRun(runId, threadId);
        if (run.status === "completed") {
            const messages = await this.client.beta.threads.messages.list(threadId, {
                order: "asc",
            });
            const newMessages = messages.data.filter((msg) => msg.run_id === runId);
            if (!this.asAgent) {
                return newMessages;
            }
            const answer = newMessages.flatMap((msg) => msg.content);
            if (answer.every((item) => item.type === "text")) {
                const answerString = answer
                    .map((item) => item.type === "text" && item.text.value)
                    .join("\n");
                return {
                    returnValues: {
                        output: answerString,
                    },
                    log: "",
                    runId,
                    threadId,
                };
            }
        }
        else if (run.status === "requires_action") {
            if (!this.asAgent) {
                return run.required_action?.submit_tool_outputs.tool_calls ?? [];
            }
            const actions = [];
            run.required_action?.submit_tool_outputs.tool_calls.forEach((item) => {
                const functionCall = item.function;
                const args = JSON.parse(functionCall.arguments);
                actions.push({
                    tool: functionCall.name,
                    toolInput: args,
                    toolCallId: item.id,
                    log: "",
                    runId,
                    threadId,
                });
            });
            return actions;
        }
        const runInfo = JSON.stringify(run, null, 2);
        throw new Error(`Unexpected run status ${run.status}.\nFull run info:\n\n${runInfo}`);
    }
}
exports.OpenAIAssistantRunnable = OpenAIAssistantRunnable;
