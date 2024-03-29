import { AsyncCaller, AsyncCallerParams } from "../util/async_caller.js";
import { Tool } from "./base.js";
/**
 * An object containing configuration parameters for the ConneryService class.
 * @extends AsyncCallerParams
 */
export interface ConneryServiceParams extends AsyncCallerParams {
    runnerUrl: string;
    apiKey: string;
}
type Parameter = {
    key: string;
    title: string;
    description: string;
    type: string;
    validation?: {
        required?: boolean;
    };
};
type Action = {
    id: string;
    key: string;
    title: string;
    description: string;
    type: string;
    inputParameters: Parameter[];
    outputParameters: Parameter[];
    pluginId: string;
};
type Input = {
    [key: string]: string;
};
type Output = {
    [key: string]: string;
};
/**
 * A LangChain Tool object wrapping a Connery action.
 * @extends Tool
 */
export declare class ConneryAction extends Tool {
    protected _action: Action;
    protected _service: ConneryService;
    name: string;
    description: string;
    /**
     * Creates a ConneryAction instance based on the provided Connery action.
     * @param _action The Connery action.
     * @param _service The ConneryService instance.
     * @returns A ConneryAction instance.
     */
    constructor(_action: Action, _service: ConneryService);
    /**
     * Runs the Connery action.
     * @param prompt This is a plain English prompt with all the information needed to run the action.
     * @returns A promise that resolves to a JSON string containing the output of the action.
     */
    protected _call(prompt: string): Promise<string>;
    /**
     * Returns the description of the Connery action.
     * @returns A string containing the description of the Connery action together with the instructions on how to use it.
     */
    protected getDescription(): string;
    /**
     * Converts the provided object to a JSON string and escapes '{' and '}' characters.
     * @param obj The object to convert to a JSON string.
     * @returns A string containing the JSON representation of the provided object with '{' and '}' characters escaped.
     */
    protected prepareJsonForTemplate(obj: any): string;
}
/**
 * A service for working with Connery actions.
 *
 * Connery is an open-source plugin infrastructure for AI.
 * Source code: https://github.com/connery-io/connery-platform
 */
export declare class ConneryService {
    protected runnerUrl: string;
    protected apiKey: string;
    protected asyncCaller: AsyncCaller;
    /**
     * Creates a ConneryService instance.
     * @param params A ConneryServiceParams object.
     * If not provided, the values are retrieved from the CONNERY_RUNNER_URL
     * and CONNERY_RUNNER_API_KEY environment variables.
     * @returns A ConneryService instance.
     */
    constructor(params?: ConneryServiceParams);
    /**
     * Returns the list of Connery actions wrapped as a LangChain Tool objects.
     * @returns A promise that resolves to an array of ConneryAction objects.
     */
    listActions(): Promise<ConneryAction[]>;
    /**
     * Returns the specified Connery action wrapped as a LangChain Tool object.
     * @param actionId The ID of the action to return.
     * @returns A promise that resolves to a ConneryAction object.
     */
    getAction(actionId: string): Promise<ConneryAction>;
    /**
     * Runs the specified Connery action with the provided input.
     * @param actionId The ID of the action to run.
     * @param prompt This is a plain English prompt with all the information needed to run the action.
     * @param input The input expected by the action.
     * If provided together with the prompt, the input takes precedence over the input specified in the prompt.
     * @returns A promise that resolves to a JSON string containing the output of the action.
     */
    runAction(actionId: string, prompt?: string, input?: Input): Promise<string>;
    /**
     * Returns the list of actions available in the Connery runner.
     * @returns A promise that resolves to an array of Action objects.
     */
    protected _listActions(): Promise<Action[]>;
    /**
     * Returns the specified action available in the Connery runner.
     * @param actionId The ID of the action to return.
     * @returns A promise that resolves to an Action object.
     * @throws An error if the action with the specified ID is not found.
     */
    protected _getAction(actionId: string): Promise<Action>;
    /**
     * Runs the specified Connery action with the provided input.
     * @param actionId The ID of the action to run.
     * @param prompt This is a plain English prompt with all the information needed to run the action.
     * @param input The input object expected by the action.
     * If provided together with the prompt, the input takes precedence over the input specified in the prompt.
     * @returns A promise that resolves to a RunActionResult object.
     */
    protected _runAction(actionId: string, prompt?: string, input?: Input): Promise<Output>;
    /**
     * Returns a standard set of HTTP headers to be used in API calls to the Connery runner.
     * @returns An object containing the standard set of HTTP headers.
     */
    protected _getHeaders(): Record<string, string>;
    /**
     * Shared error handler for API calls to the Connery runner.
     * If the response is not ok, an error is thrown containing the error message returned by the Connery runner.
     * Otherwise, the promise resolves to void.
     * @param response The response object returned by the Connery runner.
     * @param errorMessage The error message to be used in the error thrown if the response is not ok.
     * @returns A promise that resolves to void.
     * @throws An error containing the error message returned by the Connery runner.
     */
    protected _handleError(response: Response, errorMessage: string): Promise<void>;
}
export {};
