import { PromptTemplate } from "../prompts/prompt.js";
import { HumanMessage, AIMessage, } from "../schema/index.js";
import { BaseChain } from "./base.js";
import { LLMChain } from "./llm_chain.js";
import { loadQAChain } from "./question_answering/load.js";
const question_generator_template = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;
/**
 * Class for conducting conversational question-answering tasks with a
 * retrieval component. Extends the BaseChain class and implements the
 * ConversationalRetrievalQAChainInput interface.
 * @example
 * ```typescript
 * const model = new ChatAnthropic({});
 *
 * const text = fs.readFileSync("state_of_the_union.txt", "utf8");
 *
 * const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
 * const docs = await textSplitter.createDocuments([text]);
 *
 * const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());
 *
 * const chain = ConversationalRetrievalQAChain.fromLLM(
 *   model,
 *   vectorStore.asRetriever(),
 * );
 *
 * const question = "What did the president say about Justice Breyer?";
 *
 * const res = await chain.call({ question, chat_history: "" });
 * console.log(res);
 *
 * const chatHistory = `${question}\n${res.text}`;
 * const followUpRes = await chain.call({
 *   question: "Was that nice?",
 *   chat_history: chatHistory,
 * });
 * console.log(followUpRes);
 *
 * ```
 */
export class ConversationalRetrievalQAChain extends BaseChain {
    static lc_name() {
        return "ConversationalRetrievalQAChain";
    }
    get inputKeys() {
        return [this.inputKey, this.chatHistoryKey];
    }
    get outputKeys() {
        return this.combineDocumentsChain.outputKeys.concat(this.returnSourceDocuments ? ["sourceDocuments"] : []);
    }
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "inputKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "question"
        });
        Object.defineProperty(this, "chatHistoryKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "chat_history"
        });
        Object.defineProperty(this, "retriever", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "combineDocumentsChain", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "questionGeneratorChain", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "returnSourceDocuments", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "returnGeneratedQuestion", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.retriever = fields.retriever;
        this.combineDocumentsChain = fields.combineDocumentsChain;
        this.questionGeneratorChain = fields.questionGeneratorChain;
        this.inputKey = fields.inputKey ?? this.inputKey;
        this.returnSourceDocuments =
            fields.returnSourceDocuments ?? this.returnSourceDocuments;
        this.returnGeneratedQuestion =
            fields.returnGeneratedQuestion ?? this.returnGeneratedQuestion;
    }
    /**
     * Static method to convert the chat history input into a formatted
     * string.
     * @param chatHistory Chat history input which can be a string, an array of BaseMessage instances, or an array of string arrays.
     * @returns A formatted string representing the chat history.
     */
    static getChatHistoryString(chatHistory) {
        let historyMessages;
        if (Array.isArray(chatHistory)) {
            // TODO: Deprecate on a breaking release
            if (Array.isArray(chatHistory[0]) &&
                typeof chatHistory[0][0] === "string") {
                console.warn("Passing chat history as an array of strings is deprecated.\nPlease see https://js.langchain.com/docs/modules/chains/popular/chat_vector_db#externally-managed-memory for more information.");
                historyMessages = chatHistory.flat().map((stringMessage, i) => {
                    if (i % 2 === 0) {
                        return new HumanMessage(stringMessage);
                    }
                    else {
                        return new AIMessage(stringMessage);
                    }
                });
            }
            else {
                historyMessages = chatHistory;
            }
            return historyMessages
                .map((chatMessage) => {
                if (chatMessage._getType() === "human") {
                    return `Human: ${chatMessage.content}`;
                }
                else if (chatMessage._getType() === "ai") {
                    return `Assistant: ${chatMessage.content}`;
                }
                else {
                    return `${chatMessage.content}`;
                }
            })
                .join("\n");
        }
        return chatHistory;
    }
    /** @ignore */
    async _call(values, runManager) {
        if (!(this.inputKey in values)) {
            throw new Error(`Question key ${this.inputKey} not found.`);
        }
        if (!(this.chatHistoryKey in values)) {
            throw new Error(`Chat history key ${this.chatHistoryKey} not found.`);
        }
        const question = values[this.inputKey];
        const chatHistory = ConversationalRetrievalQAChain.getChatHistoryString(values[this.chatHistoryKey]);
        let newQuestion = question;
        if (chatHistory.length > 0) {
            const result = await this.questionGeneratorChain.call({
                question,
                chat_history: chatHistory,
            }, runManager?.getChild("question_generator"));
            const keys = Object.keys(result);
            if (keys.length === 1) {
                newQuestion = result[keys[0]];
            }
            else {
                throw new Error("Return from llm chain has multiple values, only single values supported.");
            }
        }
        const docs = await this.retriever.getRelevantDocuments(newQuestion, runManager?.getChild("retriever"));
        const inputs = {
            question: newQuestion,
            input_documents: docs,
            chat_history: chatHistory,
        };
        let result = await this.combineDocumentsChain.call(inputs, runManager?.getChild("combine_documents"));
        if (this.returnSourceDocuments) {
            result = {
                ...result,
                sourceDocuments: docs,
            };
        }
        if (this.returnGeneratedQuestion) {
            result = {
                ...result,
                generatedQuestion: newQuestion,
            };
        }
        return result;
    }
    _chainType() {
        return "conversational_retrieval_chain";
    }
    static async deserialize(_data, _values) {
        throw new Error("Not implemented.");
    }
    serialize() {
        throw new Error("Not implemented.");
    }
    /**
     * Static method to create a new ConversationalRetrievalQAChain from a
     * BaseLanguageModel and a BaseRetriever.
     * @param llm {@link BaseLanguageModel} instance used to generate a new question.
     * @param retriever {@link BaseRetriever} instance used to retrieve relevant documents.
     * @param options.returnSourceDocuments Whether to return source documents in the final output
     * @param options.questionGeneratorChainOptions Options to initialize the standalone question generation chain used as the first internal step
     * @param options.qaChainOptions {@link QAChainParams} used to initialize the QA chain used as the second internal step
     * @returns A new instance of ConversationalRetrievalQAChain.
     */
    static fromLLM(llm, retriever, options = {}) {
        const { questionGeneratorTemplate, qaTemplate, qaChainOptions = {
            type: "stuff",
            prompt: qaTemplate
                ? PromptTemplate.fromTemplate(qaTemplate)
                : undefined,
        }, questionGeneratorChainOptions, verbose, ...rest } = options;
        const qaChain = loadQAChain(llm, qaChainOptions);
        const questionGeneratorChainPrompt = PromptTemplate.fromTemplate(questionGeneratorChainOptions?.template ??
            questionGeneratorTemplate ??
            question_generator_template);
        const questionGeneratorChain = new LLMChain({
            prompt: questionGeneratorChainPrompt,
            llm: questionGeneratorChainOptions?.llm ?? llm,
            verbose,
        });
        const instance = new this({
            retriever,
            combineDocumentsChain: qaChain,
            questionGeneratorChain,
            verbose,
            ...rest,
        });
        return instance;
    }
}
