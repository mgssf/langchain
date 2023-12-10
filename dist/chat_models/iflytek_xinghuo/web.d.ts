import { BaseChatIflytekXinghuo } from "./common.js";
import { WebSocketStreamOptions } from "../../util/iflytek_websocket_stream.js";
/**
 * @example
 * ```typescript
 * const model = new ChatIflytekXinghuo();
 * const response = await model.call([new HumanMessage("Nice to meet you!")]);
 * console.log(response);
 * ```
 */
export declare class ChatIflytekXinghuo extends BaseChatIflytekXinghuo {
    openWebSocketStream<WebSocketStream>(options: WebSocketStreamOptions): Promise<WebSocketStream>;
}
