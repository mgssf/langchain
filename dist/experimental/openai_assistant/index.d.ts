import { type ClientOptions, OpenAI as OpenAIClient } from "openai";
import { Runnable } from "../../schema/runnable/base.js";
import type { RunnableConfig } from "../../schema/runnable/config.js";
import type { OpenAIAssistantFinish, OpenAIAssistantAction, OpenAIToolType } from "./schema.js";
import { StructuredTool } from "../../tools/base.js";
type ThreadMessage = OpenAIClient.Beta.Threads.ThreadMessage;
type RequiredActionFunctionToolCall = OpenAIClient.Beta.Threads.RequiredActionFunctionToolCall;
type ExtractRunOutput<AsAgent extends boolean | undefined> = AsAgent extends true ? OpenAIAssistantFinish | OpenAIAssistantAction[] : ThreadMessage[] | RequiredActionFunctionToolCall[];
export type OpenAIAssistantRunnableInput<AsAgent extends boolean | undefined = undefined> = {
    client?: OpenAIClient;
    clientOptions?: ClientOptions;
    assistantId: string;
    pollIntervalMs?: number;
    asAgent?: AsAgent;
};
export declare class OpenAIAssistantRunnable<AsAgent extends boolean | undefined, RunInput extends Record<string, any> = Record<string, any>> extends Runnable<RunInput, ExtractRunOutput<AsAgent>> {
    lc_namespace: string[];
    private client;
    assistantId: string;
    pollIntervalMs: number;
    asAgent?: AsAgent;
    constructor(fields: OpenAIAssistantRunnableInput<AsAgent>);
    static createAssistant<AsAgent extends boolean>({ model, name, instructions, tools, client, clientOptions, asAgent, pollIntervalMs, fileIds, }: Omit<OpenAIAssistantRunnableInput<AsAgent>, "assistantId"> & {
        model: string;
        name?: string;
        instructions?: string;
        tools?: OpenAIToolType | Array<StructuredTool>;
        fileIds?: string[];
    }): Promise<OpenAIAssistantRunnable<AsAgent, Record<string, any>>>;
    invoke(input: RunInput, _options?: RunnableConfig): Promise<ExtractRunOutput<AsAgent>>;
    /**
     * Delete an assistant.
     *
     * @link {https://platform.openai.com/docs/api-reference/assistants/deleteAssistant}
     * @returns {Promise<AssistantDeleted>}
     */
    deleteAssistant(): Promise<OpenAIClient.Beta.Assistants.AssistantDeleted>;
    /**
     * Retrieves an assistant.
     *
     * @link {https://platform.openai.com/docs/api-reference/assistants/getAssistant}
     * @returns {Promise<OpenAIClient.Beta.Assistants.Assistant>}
     */
    getAssistant(): Promise<OpenAIClient.Beta.Assistants.Assistant>;
    /**
     * Modifies an assistant.
     *
     * @link {https://platform.openai.com/docs/api-reference/assistants/modifyAssistant}
     * @returns {Promise<OpenAIClient.Beta.Assistants.Assistant>}
     */
    modifyAssistant<AsAgent extends boolean>({ model, name, instructions, fileIds, }: Omit<OpenAIAssistantRunnableInput<AsAgent>, "assistantId" | "tools"> & {
        model?: string;
        name?: string;
        instructions?: string;
        fileIds?: string[];
    }): Promise<OpenAIClient.Beta.Assistants.Assistant>;
    private _parseStepsInput;
    private _createRun;
    private _createThreadAndRun;
    private _waitForRun;
    private _getResponse;
}
export {};
