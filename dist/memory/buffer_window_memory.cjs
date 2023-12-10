"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferWindowMemory = void 0;
const base_js_1 = require("./base.cjs");
const chat_memory_js_1 = require("./chat_memory.cjs");
/**
 * Class for managing and storing previous chat messages. It extends the
 * BaseChatMemory class and implements the BufferWindowMemoryInput
 * interface. This class is stateful and stores messages in a buffer. When
 * called in a chain, it returns all of the messages it has stored.
 * @example
 * ```typescript
 * const prompt =
 *   PromptTemplate.fromTemplate(`The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.
 * Current conversation:
 * {chat_history}
 * Human: {input}
 * AI:`);
 *
 * const chain = new LLMChain({
 *   llm: new ChatOpenAI({ temperature: 0.9 }),
 *   prompt,
 *   memory: new BufferWindowMemory({ memoryKey: "chat_history", k: 1 }),
 * });
 *
 * // Example of initiating a conversation with the AI
 * const res1 = await chain.call({ input: "Hi! I'm Jim." });
 * console.log({ res1 });
 *
 * // Example of following up with another question
 * const res2 = await chain.call({ input: "What's my name?" });
 * console.log({ res2 });
 * ```
 */
class BufferWindowMemory extends chat_memory_js_1.BaseChatMemory {
    constructor(fields) {
        super({
            returnMessages: fields?.returnMessages ?? false,
            chatHistory: fields?.chatHistory,
            inputKey: fields?.inputKey,
            outputKey: fields?.outputKey,
        });
        Object.defineProperty(this, "humanPrefix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "Human"
        });
        Object.defineProperty(this, "aiPrefix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "AI"
        });
        Object.defineProperty(this, "memoryKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "history"
        });
        Object.defineProperty(this, "k", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 5
        });
        this.humanPrefix = fields?.humanPrefix ?? this.humanPrefix;
        this.aiPrefix = fields?.aiPrefix ?? this.aiPrefix;
        this.memoryKey = fields?.memoryKey ?? this.memoryKey;
        this.k = fields?.k ?? this.k;
    }
    get memoryKeys() {
        return [this.memoryKey];
    }
    /**
     * Method to load the memory variables. Retrieves the chat messages from
     * the history, slices the last 'k' messages, and stores them in the
     * memory under the memoryKey. If the returnMessages property is set to
     * true, the method returns the messages as they are. Otherwise, it
     * returns a string representation of the messages.
     * @param _values InputValues object.
     * @returns Promise that resolves to a MemoryVariables object.
     */
    async loadMemoryVariables(_values) {
        const messages = await this.chatHistory.getMessages();
        if (this.returnMessages) {
            const result = {
                [this.memoryKey]: messages.slice(-this.k * 2),
            };
            return result;
        }
        const result = {
            [this.memoryKey]: (0, base_js_1.getBufferString)(messages.slice(-this.k * 2), this.humanPrefix, this.aiPrefix),
        };
        return result;
    }
}
exports.BufferWindowMemory = BufferWindowMemory;
