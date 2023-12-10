import { BaseBedrockInput } from "../../util/bedrock.js";
import { BedrockChat as BaseBedrockChat } from "./web.js";
import { BaseChatModelParams } from "../base.js";
/**
 * @example
 * ```typescript
 * const model = new BedrockChat({
 *   model: "anthropic.claude-v2",
 *   region: "us-east-1",
 * });
 * const res = await model.invoke([{ content: "Tell me a joke" }]);
 * console.log(res);
 * ```
 */
export declare class BedrockChat extends BaseBedrockChat {
    static lc_name(): string;
    constructor(fields?: Partial<BaseBedrockInput> & BaseChatModelParams);
}
export { convertMessagesToPromptAnthropic, convertMessagesToPrompt, } from "./web.js";
/**
 * @deprecated Use `BedrockChat` instead.
 */
export declare const ChatBedrock: typeof BedrockChat;
