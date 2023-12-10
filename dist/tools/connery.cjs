"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConneryService = exports.ConneryAction = void 0;
const async_caller_js_1 = require("../util/async_caller.cjs");
const env_js_1 = require("../util/env.cjs");
const base_js_1 = require("./base.cjs");
/**
 * A LangChain Tool object wrapping a Connery action.
 * @extends Tool
 */
class ConneryAction extends base_js_1.Tool {
    /**
     * Creates a ConneryAction instance based on the provided Connery action.
     * @param _action The Connery action.
     * @param _service The ConneryService instance.
     * @returns A ConneryAction instance.
     */
    constructor(_action, _service) {
        super();
        Object.defineProperty(this, "_action", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: _action
        });
        Object.defineProperty(this, "_service", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: _service
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "description", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = this._action.title;
        this.description = this.getDescription();
    }
    /**
     * Runs the Connery action.
     * @param prompt This is a plain English prompt with all the information needed to run the action.
     * @returns A promise that resolves to a JSON string containing the output of the action.
     */
    _call(prompt) {
        return this._service.runAction(this._action.id, prompt);
    }
    /**
     * Returns the description of the Connery action.
     * @returns A string containing the description of the Connery action together with the instructions on how to use it.
     */
    getDescription() {
        const { title, description } = this._action;
        const inputParameters = this.prepareJsonForTemplate(this._action.inputParameters);
        const example1InputParametersSchema = this.prepareJsonForTemplate([
            {
                key: "recipient",
                title: "Email Recipient",
                description: "Email address of the email recipient.",
                type: "string",
                validation: {
                    required: true,
                },
            },
            {
                key: "subject",
                title: "Email Subject",
                description: "Subject of the email.",
                type: "string",
                validation: {
                    required: true,
                },
            },
            {
                key: "body",
                title: "Email Body",
                description: "Body of the email.",
                type: "string",
                validation: {
                    required: true,
                },
            },
        ]);
        const descriptionTemplate = "# Instructions about tool input:\n" +
            "The input to this tool is a plain English prompt with all the input parameters needed to call it. " +
            "The input parameters schema of this tool is provided below. " +
            "Use the input parameters schema to construct the prompt for the tool. " +
            "If the input parameter is required in the schema, it must be provided in the prompt. " +
            "Do not come up with the values for the input parameters yourself. " +
            "If you do not have enough information to fill in the input parameter, ask the user to provide it. " +
            "See examples below on how to construct the prompt based on the provided tool information. " +
            "\n\n" +
            "# Instructions about tool output:\n" +
            "The output of this tool is a JSON string. " +
            "Retrieve the output parameters from the JSON string and use them in the next tool. " +
            "Do not return the JSON string as the output of the tool. " +
            "\n\n" +
            "# Example:\n" +
            "Tool information:\n" +
            "- Title: Send email\n" +
            "- Description: Send an email to a recipient.\n" +
            `- Input parameters schema in JSON fromat: ${example1InputParametersSchema}\n` +
            "The tool input prompt:\n" +
            "recipient: test@example.com, subject: 'Test email', body: 'This is a test email sent from Langchain Connery tool.'\n" +
            "\n\n" +
            "# The tool information\n" +
            `- Title: ${title}\n` +
            `- Description: ${description}\n` +
            `- Input parameters schema in JSON fromat: ${inputParameters}\n`;
        return descriptionTemplate;
    }
    /**
     * Converts the provided object to a JSON string and escapes '{' and '}' characters.
     * @param obj The object to convert to a JSON string.
     * @returns A string containing the JSON representation of the provided object with '{' and '}' characters escaped.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prepareJsonForTemplate(obj) {
        // Convert the object to a JSON string
        const jsonString = JSON.stringify(obj);
        // Replace '{' with '{{' and '}' with '}}'
        const escapedJSON = jsonString.replace(/{/g, "{{").replace(/}/g, "}}");
        return escapedJSON;
    }
}
exports.ConneryAction = ConneryAction;
/**
 * A service for working with Connery actions.
 *
 * Connery is an open-source plugin infrastructure for AI.
 * Source code: https://github.com/connery-io/connery-platform
 */
class ConneryService {
    /**
     * Creates a ConneryService instance.
     * @param params A ConneryServiceParams object.
     * If not provided, the values are retrieved from the CONNERY_RUNNER_URL
     * and CONNERY_RUNNER_API_KEY environment variables.
     * @returns A ConneryService instance.
     */
    constructor(params) {
        Object.defineProperty(this, "runnerUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "apiKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "asyncCaller", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const runnerUrl = params?.runnerUrl ?? (0, env_js_1.getEnvironmentVariable)("CONNERY_RUNNER_URL");
        const apiKey = params?.apiKey ?? (0, env_js_1.getEnvironmentVariable)("CONNERY_RUNNER_API_KEY");
        if (!runnerUrl || !apiKey) {
            throw new Error("CONNERY_RUNNER_URL and CONNERY_RUNNER_API_KEY environment variables must be set.");
        }
        this.runnerUrl = runnerUrl;
        this.apiKey = apiKey;
        this.asyncCaller = new async_caller_js_1.AsyncCaller(params ?? {});
    }
    /**
     * Returns the list of Connery actions wrapped as a LangChain Tool objects.
     * @returns A promise that resolves to an array of ConneryAction objects.
     */
    async listActions() {
        const actions = await this._listActions();
        return actions.map((action) => new ConneryAction(action, this));
    }
    /**
     * Returns the specified Connery action wrapped as a LangChain Tool object.
     * @param actionId The ID of the action to return.
     * @returns A promise that resolves to a ConneryAction object.
     */
    async getAction(actionId) {
        const action = await this._getAction(actionId);
        return new ConneryAction(action, this);
    }
    /**
     * Runs the specified Connery action with the provided input.
     * @param actionId The ID of the action to run.
     * @param prompt This is a plain English prompt with all the information needed to run the action.
     * @param input The input expected by the action.
     * If provided together with the prompt, the input takes precedence over the input specified in the prompt.
     * @returns A promise that resolves to a JSON string containing the output of the action.
     */
    async runAction(actionId, prompt, input) {
        const result = await this._runAction(actionId, prompt, input);
        return JSON.stringify(result);
    }
    /**
     * Returns the list of actions available in the Connery runner.
     * @returns A promise that resolves to an array of Action objects.
     */
    async _listActions() {
        const response = await this.asyncCaller.call(fetch, `${this.runnerUrl}/v1/actions`, {
            method: "GET",
            headers: this._getHeaders(),
        });
        await this._handleError(response, "Failed to list actions");
        const apiResponse = await response.json();
        return apiResponse.data;
    }
    /**
     * Returns the specified action available in the Connery runner.
     * @param actionId The ID of the action to return.
     * @returns A promise that resolves to an Action object.
     * @throws An error if the action with the specified ID is not found.
     */
    async _getAction(actionId) {
        const actions = await this._listActions();
        const action = actions.find((a) => a.id === actionId);
        if (!action) {
            throw new Error(`The action with ID "${actionId}" was not found in the list of available actions in the Connery runner.`);
        }
        return action;
    }
    /**
     * Runs the specified Connery action with the provided input.
     * @param actionId The ID of the action to run.
     * @param prompt This is a plain English prompt with all the information needed to run the action.
     * @param input The input object expected by the action.
     * If provided together with the prompt, the input takes precedence over the input specified in the prompt.
     * @returns A promise that resolves to a RunActionResult object.
     */
    async _runAction(actionId, prompt, input) {
        const response = await this.asyncCaller.call(fetch, `${this.runnerUrl}/v1/actions/${actionId}/run`, {
            method: "POST",
            headers: this._getHeaders(),
            body: JSON.stringify({
                prompt,
                input,
            }),
        });
        await this._handleError(response, "Failed to run action");
        const apiResponse = await response.json();
        return apiResponse.data.output;
    }
    /**
     * Returns a standard set of HTTP headers to be used in API calls to the Connery runner.
     * @returns An object containing the standard set of HTTP headers.
     */
    _getHeaders() {
        return {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
        };
    }
    /**
     * Shared error handler for API calls to the Connery runner.
     * If the response is not ok, an error is thrown containing the error message returned by the Connery runner.
     * Otherwise, the promise resolves to void.
     * @param response The response object returned by the Connery runner.
     * @param errorMessage The error message to be used in the error thrown if the response is not ok.
     * @returns A promise that resolves to void.
     * @throws An error containing the error message returned by the Connery runner.
     */
    async _handleError(response, errorMessage) {
        if (response.ok)
            return;
        const apiErrorResponse = await response.json();
        throw new Error(`${errorMessage}. Status code: ${response.status}. Error message: ${apiErrorResponse.error.message}`);
    }
}
exports.ConneryService = ConneryService;
