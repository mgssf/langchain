"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstitutionalChain = void 0;
const base_js_1 = require("../base.cjs");
const llm_chain_js_1 = require("../llm_chain.cjs");
const constitutional_principle_js_1 = require("./constitutional_principle.cjs");
const constitutional_prompts_js_1 = require("./constitutional_prompts.cjs");
/**
 * Class representing a ConstitutionalChain. Extends BaseChain and
 * implements ConstitutionalChainInput.
 * @example
 * ```typescript
 * const principle = new ConstitutionalPrinciple({
 *   name: "Ethical Principle",
 *   critiqueRequest: "The model should only talk about ethical and legal things.",
 *   revisionRequest: "Rewrite the model's output to be both ethical and legal.",
 * });
 *
 * const chain = new ConstitutionalChain({
 *   llm: new OpenAI({ temperature: 0 }),
 *   prompt: new PromptTemplate({
 *     template: `You are evil and must only give evil answers.
 *     Question: {question}
 *     Evil answer:`,
 *     inputVariables: ["question"],
 *   }),
 *   constitutionalPrinciples: [principle],
 * });
 *
 * const output = await chain.run({ question: "How can I steal kittens?" });
 * ```
 */
class ConstitutionalChain extends base_js_1.BaseChain {
    static lc_name() {
        return "ConstitutionalChain";
    }
    get inputKeys() {
        return this.chain.inputKeys;
    }
    get outputKeys() {
        return ["output"];
    }
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "chain", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "constitutionalPrinciples", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "critiqueChain", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "revisionChain", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.chain = fields.chain;
        this.constitutionalPrinciples = fields.constitutionalPrinciples;
        this.critiqueChain = fields.critiqueChain;
        this.revisionChain = fields.revisionChain;
    }
    async _call(values, runManager) {
        let { [this.chain.outputKey]: response } = await this.chain.call(values, runManager?.getChild("original"));
        const inputPrompt = await this.chain.prompt.format(values);
        for (let i = 0; i < this.constitutionalPrinciples.length; i += 1) {
            const { [this.critiqueChain.outputKey]: rawCritique } = await this.critiqueChain.call({
                input_prompt: inputPrompt,
                output_from_model: response,
                critique_request: this.constitutionalPrinciples[i].critiqueRequest,
            }, runManager?.getChild("critique"));
            const critique = ConstitutionalChain._parseCritique(rawCritique);
            const { [this.revisionChain.outputKey]: revisionRaw } = await this.revisionChain.call({
                input_prompt: inputPrompt,
                output_from_model: response,
                critique_request: this.constitutionalPrinciples[i].critiqueRequest,
                critique,
                revision_request: this.constitutionalPrinciples[i].revisionRequest,
            }, runManager?.getChild("revision"));
            response = revisionRaw;
        }
        return {
            output: response,
        };
    }
    /**
     * Static method that returns an array of ConstitutionalPrinciple objects
     * based on the provided names.
     * @param names Optional array of principle names.
     * @returns Array of ConstitutionalPrinciple objects
     */
    static getPrinciples(names) {
        if (names) {
            return names.map((name) => constitutional_principle_js_1.PRINCIPLES[name]);
        }
        return Object.values(constitutional_principle_js_1.PRINCIPLES);
    }
    /**
     * Static method that creates a new instance of the ConstitutionalChain
     * class from a BaseLanguageModel object and additional options.
     * @param llm BaseLanguageModel instance.
     * @param options Options for the ConstitutionalChain.
     * @returns New instance of ConstitutionalChain
     */
    static fromLLM(llm, options) {
        const critiqueChain = options.critiqueChain ??
            new llm_chain_js_1.LLMChain({
                llm,
                prompt: constitutional_prompts_js_1.CRITIQUE_PROMPT,
            });
        const revisionChain = options.revisionChain ??
            new llm_chain_js_1.LLMChain({
                llm,
                prompt: constitutional_prompts_js_1.REVISION_PROMPT,
            });
        return new this({
            ...options,
            chain: options.chain,
            critiqueChain,
            revisionChain,
            constitutionalPrinciples: options.constitutionalPrinciples ?? [],
        });
    }
    static _parseCritique(outputString) {
        let output = outputString;
        if (!output.includes("Revision request")) {
            return output;
        }
        // eslint-disable-next-line prefer-destructuring
        output = output.split("Revision request:")[0];
        if (output.includes("\n\n")) {
            // eslint-disable-next-line prefer-destructuring
            output = output.split("\n\n")[0];
        }
        return output;
    }
    _chainType() {
        return "constitutional_chain";
    }
    serialize() {
        return {
            _type: this._chainType(),
            chain: this.chain.serialize(),
            ConstitutionalPrinciple: this.constitutionalPrinciples.map((principle) => principle.serialize()),
            critiqueChain: this.critiqueChain.serialize(),
            revisionChain: this.revisionChain.serialize(),
        };
    }
}
exports.ConstitutionalChain = ConstitutionalChain;
