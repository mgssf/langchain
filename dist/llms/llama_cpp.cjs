"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlamaCpp = void 0;
const llama_cpp_js_1 = require("../util/llama_cpp.cjs");
const base_js_1 = require("./base.cjs");
const index_js_1 = require("../schema/index.cjs");
/**
 *  To use this model you need to have the `node-llama-cpp` module installed.
 *  This can be installed using `npm install -S node-llama-cpp` and the minimum
 *  version supported in version 2.0.0.
 *  This also requires that have a locally built version of Llama2 installed.
 */
class LlamaCpp extends base_js_1.LLM {
    static lc_name() {
        return "LlamaCpp";
    }
    constructor(inputs) {
        super(inputs);
        Object.defineProperty(this, "maxTokens", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "temperature", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "topK", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "topP", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "trimWhitespaceSuffix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_model", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_context", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_session", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.maxTokens = inputs?.maxTokens;
        this.temperature = inputs?.temperature;
        this.topK = inputs?.topK;
        this.topP = inputs?.topP;
        this.trimWhitespaceSuffix = inputs?.trimWhitespaceSuffix;
        this._model = (0, llama_cpp_js_1.createLlamaModel)(inputs);
        this._context = (0, llama_cpp_js_1.createLlamaContext)(this._model, inputs);
        this._session = (0, llama_cpp_js_1.createLlamaSession)(this._context);
    }
    _llmType() {
        return "llama2_cpp";
    }
    /** @ignore */
    async _call(prompt, options) {
        try {
            const promptOptions = {
                onToken: options?.onToken,
                maxTokens: this?.maxTokens,
                temperature: this?.temperature,
                topK: this?.topK,
                topP: this?.topP,
                trimWhitespaceSuffix: this?.trimWhitespaceSuffix,
            };
            const completion = await this._session.prompt(prompt, promptOptions);
            return completion;
        }
        catch (e) {
            throw new Error("Error getting prompt completion.");
        }
    }
    async *_streamResponseChunks(prompt, _options, runManager) {
        const promptOptions = {
            temperature: this?.temperature,
            topK: this?.topK,
            topP: this?.topP,
        };
        const stream = await this.caller.call(async () => this._context.evaluate(this._context.encode(prompt), promptOptions));
        for await (const chunk of stream) {
            yield new index_js_1.GenerationChunk({
                text: this._context.decode([chunk]),
                generationInfo: {},
            });
            await runManager?.handleLLMNewToken(this._context.decode([chunk]) ?? "");
        }
    }
}
exports.LlamaCpp = LlamaCpp;
