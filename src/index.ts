export interface Env {
	DB: KVNamespace;
	CHAT: DurableObjectNamespace;
}

// @ts-ignore
import home from './home.html';

export class ChatRoom {
	state: DurableObjectState;
	users: WebSocket[];
	messages: string[];
	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.users = [];
		this.messages = [];
	}

	handleHome() {
		return new Response(home, {
			headers: {
				'Content-Type': 'text/html;chartset=utf-8',
			},
		});
	}

	handleWebSockt(webSocket: WebSocket) {
		webSocket.accept();
		this.users.push(webSocket);
		webSocket.send(JSON.stringify({ message: 'Connected!' }));
		this.messages.forEach((message) => webSocket.send(message));

		webSocket.addEventListener('message', (event) => {
			this.messages.push(event.data.toString());
			this.users.forEach((user) => user.send(event.data));
		});
	}

	handleConnect(request: Request) {
		const pairs = new WebSocketPair();
		this.handleWebSockt(pairs[1]);
		return new Response(null, { status: 101, webSocket: pairs[0] });
	}

	handleNotFound() {
		return new Response(null, {
			status: 404,
		});
	}

	async fetch(request: Request, env: Env) {
		const { pathname } = new URL(request.url);
		switch (pathname) {
			case '/':
				return this.handleHome();
			case '/connect':
				return this.handleConnect(request);
			default:
				return this.handleNotFound();
		}
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const id = env.CHAT.idFromName('counter');
		const durableObject = env.CHAT.get(id);
		const response = await durableObject.fetch(request);
		return response;
	},
};
