import { SignatureV4 } from "@smithy/signature-v4";
import { HttpRequest } from "@smithy/protocol-http";
import { EventStreamCodec } from "@smithy/eventstream-codec";
import { fromUtf8, toUtf8 } from "@smithy/util-utf8";
import { Sha256 } from "@aws-crypto/sha256-js";
import { BedrockLLMInputOutputAdapter, } from "../../util/bedrock.js";
import { getEnvironmentVariable } from "../../util/env.js";
import { LLM } from "../base.js";
import { GenerationChunk } from "../../schema/index.js";
/**
 * A type of Large Language Model (LLM) that interacts with the Bedrock
 * service. It extends the base `LLM` class and implements the
 * `BaseBedrockInput` interface. The class is designed to authenticate and
 * interact with the Bedrock service, which is a part of Amazon Web
 * Services (AWS). It uses AWS credentials for authentication and can be
 * configured with various parameters such as the model to use, the AWS
 * region, and the maximum number of tokens to generate.
 */
export class Bedrock extends LLM {
    get lc_aliases() {
        return {
            model: "model_id",
            region: "region_name",
        };
    }
    get lc_secrets() {
        return {
            "credentials.accessKeyId": "BEDROCK_AWS_ACCESS_KEY_ID",
            "credentials.secretAccessKey": "BEDROCK_AWS_SECRET_ACCESS_KEY",
        };
    }
    get lc_attributes() {
        return { region: this.region };
    }
    _llmType() {
        return "bedrock";
    }
    static lc_name() {
        return "Bedrock";
    }
    constructor(fields) {
        super(fields ?? {});
        Object.defineProperty(this, "model", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "amazon.titan-tg1-large"
        });
        Object.defineProperty(this, "region", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "credentials", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "temperature", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: undefined
        });
        Object.defineProperty(this, "maxTokens", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: undefined
        });
        Object.defineProperty(this, "fetchFn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "endpointHost", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** @deprecated */
        Object.defineProperty(this, "stopSequences", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "modelKwargs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "codec", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new EventStreamCodec(toUtf8, fromUtf8)
        });
        Object.defineProperty(this, "streaming", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        this.model = fields?.model ?? this.model;
        const allowedModels = ["ai21", "anthropic", "amazon", "cohere", "meta"];
        if (!allowedModels.includes(this.model.split(".")[0])) {
            throw new Error(`Unknown model: '${this.model}', only these are supported: ${allowedModels}`);
        }
        const region = fields?.region ?? getEnvironmentVariable("AWS_DEFAULT_REGION");
        if (!region) {
            throw new Error("Please set the AWS_DEFAULT_REGION environment variable or pass it to the constructor as the region field.");
        }
        this.region = region;
        const credentials = fields?.credentials;
        if (!credentials) {
            throw new Error("Please set the AWS credentials in the 'credentials' field.");
        }
        this.credentials = credentials;
        this.temperature = fields?.temperature ?? this.temperature;
        this.maxTokens = fields?.maxTokens ?? this.maxTokens;
        this.fetchFn = fields?.fetchFn ?? fetch.bind(globalThis);
        this.endpointHost = fields?.endpointHost ?? fields?.endpointUrl;
        this.stopSequences = fields?.stopSequences;
        this.modelKwargs = fields?.modelKwargs;
        this.streaming = fields?.streaming ?? this.streaming;
    }
    /** Call out to Bedrock service model.
      Arguments:
        prompt: The prompt to pass into the model.
  
      Returns:
        The string generated by the model.
  
      Example:
        response = model.call("Tell me a joke.")
    */
    async _call(prompt, options, runManager) {
        const service = "bedrock-runtime";
        const endpointHost = this.endpointHost ?? `${service}.${this.region}.amazonaws.com`;
        const provider = this.model.split(".")[0];
        if (this.streaming) {
            const stream = this._streamResponseChunks(prompt, options, runManager);
            let finalResult;
            for await (const chunk of stream) {
                if (finalResult === undefined) {
                    finalResult = chunk;
                }
                else {
                    finalResult = finalResult.concat(chunk);
                }
            }
            return finalResult?.text ?? "";
        }
        const response = await this._signedFetch(prompt, options, {
            bedrockMethod: "invoke",
            endpointHost,
            provider,
        });
        const json = await response.json();
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${json.message ?? JSON.stringify(json)}`);
        }
        const text = BedrockLLMInputOutputAdapter.prepareOutput(provider, json);
        return text;
    }
    async _signedFetch(prompt, options, fields) {
        const { bedrockMethod, endpointHost, provider } = fields;
        const inputBody = BedrockLLMInputOutputAdapter.prepareInput(provider, prompt, this.maxTokens, this.temperature, options.stop ?? this.stopSequences, this.modelKwargs, fields.bedrockMethod);
        const url = new URL(`https://${endpointHost}/model/${this.model}/${bedrockMethod}`);
        const request = new HttpRequest({
            hostname: url.hostname,
            path: url.pathname,
            protocol: url.protocol,
            method: "POST",
            body: JSON.stringify(inputBody),
            query: Object.fromEntries(url.searchParams.entries()),
            headers: {
                // host is required by AWS Signature V4: https://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
                host: url.host,
                accept: "application/json",
                "content-type": "application/json",
            },
        });
        const signer = new SignatureV4({
            credentials: this.credentials,
            service: "bedrock",
            region: this.region,
            sha256: Sha256,
        });
        const signedRequest = await signer.sign(request);
        // Send request to AWS using the low-level fetch API
        const response = await this.caller.callWithOptions({ signal: options.signal }, async () => this.fetchFn(url, {
            headers: signedRequest.headers,
            body: signedRequest.body,
            method: signedRequest.method,
        }));
        return response;
    }
    invocationParams(options) {
        return {
            model: this.model,
            region: this.region,
            temperature: this.temperature,
            maxTokens: this.maxTokens,
            stop: options?.stop ?? this.stopSequences,
            modelKwargs: this.modelKwargs,
        };
    }
    async *_streamResponseChunks(prompt, options, runManager) {
        const provider = this.model.split(".")[0];
        const bedrockMethod = provider === "anthropic" || provider === "cohere" || provider === "meta"
            ? "invoke-with-response-stream"
            : "invoke";
        const service = "bedrock-runtime";
        const endpointHost = this.endpointHost ?? `${service}.${this.region}.amazonaws.com`;
        // Send request to AWS using the low-level fetch API
        const response = await this._signedFetch(prompt, options, {
            bedrockMethod,
            endpointHost,
            provider,
        });
        if (response.status < 200 || response.status >= 300) {
            throw Error(`Failed to access underlying url '${endpointHost}': got ${response.status} ${response.statusText}: ${await response.text()}`);
        }
        if (provider === "anthropic" ||
            provider === "cohere" ||
            provider === "meta") {
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            for await (const chunk of this._readChunks(reader)) {
                const event = this.codec.decode(chunk);
                if ((event.headers[":event-type"] !== undefined &&
                    event.headers[":event-type"].value !== "chunk") ||
                    event.headers[":content-type"].value !== "application/json") {
                    throw Error(`Failed to get event chunk: got ${chunk}`);
                }
                const body = JSON.parse(decoder.decode(event.body));
                if (body.message) {
                    throw new Error(body.message);
                }
                if (body.bytes !== undefined) {
                    const chunkResult = JSON.parse(decoder.decode(Uint8Array.from(atob(body.bytes), (m) => m.codePointAt(0) ?? 0)));
                    const text = BedrockLLMInputOutputAdapter.prepareOutput(provider, chunkResult);
                    yield new GenerationChunk({
                        text,
                        generationInfo: {},
                    });
                    // eslint-disable-next-line no-void
                    void runManager?.handleLLMNewToken(text);
                }
            }
        }
        else {
            const json = await response.json();
            const text = BedrockLLMInputOutputAdapter.prepareOutput(provider, json);
            yield new GenerationChunk({
                text,
                generationInfo: {},
            });
            // eslint-disable-next-line no-void
            void runManager?.handleLLMNewToken(text);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _readChunks(reader) {
        function _concatChunks(a, b) {
            const newBuffer = new Uint8Array(a.length + b.length);
            newBuffer.set(a);
            newBuffer.set(b, a.length);
            return newBuffer;
        }
        function getMessageLength(buffer) {
            if (buffer.byteLength === 0)
                return 0;
            const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            return view.getUint32(0, false);
        }
        return {
            async *[Symbol.asyncIterator]() {
                let readResult = await reader.read();
                let buffer = new Uint8Array(0);
                while (!readResult.done) {
                    const chunk = readResult.value;
                    buffer = _concatChunks(buffer, chunk);
                    let messageLength = getMessageLength(buffer);
                    while (buffer.byteLength > 0 && buffer.byteLength >= messageLength) {
                        yield buffer.slice(0, messageLength);
                        buffer = buffer.slice(messageLength);
                        messageLength = getMessageLength(buffer);
                    }
                    readResult = await reader.read();
                }
            },
        };
    }
}
