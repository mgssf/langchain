import { JsonSchema7ObjectType } from "zod-to-json-schema/src/parsers/object.js";
import { type Operation as JSONPatchOperation } from "@langchain/core/utils/json_patch";
import { ChatGeneration, Generation } from "../schema/index.js";
import { Optional } from "../types/type-utils.js";
import { BaseCumulativeTransformOutputParser, type BaseCumulativeTransformOutputParserInput, BaseLLMOutputParser } from "../schema/output_parser.js";
/**
 * Represents optional parameters for a function in a JSON Schema.
 */
export type FunctionParameters = Optional<JsonSchema7ObjectType, "additionalProperties">;
/**
 * Class for parsing the output of an LLM. Can be configured to return
 * only the arguments of the function call in the output.
 */
export declare class OutputFunctionsParser extends BaseLLMOutputParser<string> {
    static lc_name(): string;
    lc_namespace: string[];
    lc_serializable: boolean;
    argsOnly: boolean;
    constructor(config?: {
        argsOnly?: boolean;
    });
    /**
     * Parses the output and returns a string representation of the function
     * call or its arguments.
     * @param generations The output of the LLM to parse.
     * @returns A string representation of the function call or its arguments.
     */
    parseResult(generations: Generation[] | ChatGeneration[]): Promise<string>;
}
/**
 * Class for parsing the output of an LLM into a JSON object. Uses an
 * instance of `OutputFunctionsParser` to parse the output.
 */
export declare class JsonOutputFunctionsParser extends BaseCumulativeTransformOutputParser<object> {
    static lc_name(): string;
    lc_namespace: string[];
    lc_serializable: boolean;
    outputParser: OutputFunctionsParser;
    argsOnly: boolean;
    constructor(config?: {
        argsOnly?: boolean;
    } & BaseCumulativeTransformOutputParserInput);
    protected _diff(prev: JSONPatchOperation | undefined, next: JSONPatchOperation): object | undefined;
    parsePartialResult(generations: ChatGeneration[]): Promise<object | undefined>;
    /**
     * Parses the output and returns a JSON object. If `argsOnly` is true,
     * only the arguments of the function call are returned.
     * @param generations The output of the LLM to parse.
     * @returns A JSON object representation of the function call or its arguments.
     */
    parseResult(generations: Generation[] | ChatGeneration[]): Promise<object>;
    parse(text: string): Promise<object>;
    getFormatInstructions(): string;
}
/**
 * Class for parsing the output of an LLM into a JSON object and returning
 * a specific attribute. Uses an instance of `JsonOutputFunctionsParser`
 * to parse the output.
 */
export declare class JsonKeyOutputFunctionsParser<T = object> extends BaseLLMOutputParser<T> {
    static lc_name(): string;
    lc_namespace: string[];
    lc_serializable: boolean;
    outputParser: JsonOutputFunctionsParser;
    attrName: string;
    constructor(fields: {
        attrName: string;
    });
    /**
     * Parses the output and returns a specific attribute of the parsed JSON
     * object.
     * @param generations The output of the LLM to parse.
     * @returns The value of a specific attribute of the parsed JSON object.
     */
    parseResult(generations: Generation[] | ChatGeneration[]): Promise<T>;
}
