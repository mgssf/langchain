import { Tool, ToolParams } from "./base.js";
/**
 * @example
 * ```typescript
 * const tool = new WolframAlphaTool({
 *   appid: "YOUR_APP_ID",
 * });
 * const res = await tool.invoke("What is 2 * 2?");
 * ```
 */
export declare class WolframAlphaTool extends Tool {
    appid: string;
    name: string;
    description: string;
    constructor(fields: ToolParams & {
        appid: string;
    });
    get lc_namespace(): string[];
    static lc_name(): string;
    _call(query: string): Promise<string>;
}
