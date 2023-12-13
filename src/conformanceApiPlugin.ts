import { FastifyPluginAsync } from "fastify";
import type { IConformanceApi, IGetApiInfoRequest, IGetWidgetsRequest, IGetWidgetRequest, IGetWidgetsResponse, ICreateWidgetRequest, IWidget, IDeleteWidgetRequest, IGetWidgetBatchRequest } from "./conformanceApiTypes";

const standardErrorCodes: { [code: string]: number } = {
	NotModified: 304,
	InvalidRequest: 400,
	NotAuthenticated: 401,
	NotAuthorized: 403,
	NotFound: 404,
	Conflict: 409,
	RequestTooLarge: 413,
	TooManyRequests: 429,
	InternalError: 500,
	ServiceUnavailable: 503,
	NotAdmin: 403,
};

export type ConformanceApiPluginOptions = {
	api: IConformanceApi;
}

export const conformanceApiPlugin: FastifyPluginAsync<ConformanceApiPluginOptions> = async (fastify, opts) => {
	const api = opts.api;
	fastify.route({
		url: "/",
		method: "GET",
		handler: async function (req, reply) {
			const request: IGetApiInfoRequest = {};

			const result = await api.getApiInfo(request);

			if (result.error) {
				const status = result.error.code && standardErrorCodes[result.error.code];
				reply.status(status || 500).send(result.error);
				return;
			}

			if (result.value) {
				reply.send(result.value);
			}
		},
	});

	fastify.route({
		url: "/widgets",
		method: "GET",
		handler: async (req, reply) => {
			const request: IGetWidgetsRequest = {};

			const query = req.query as Record<string, string>;
			if (typeof query["q"] === "string") {
				request.query = query["q"];
			}

			const result = await api.getWidgets(request);

			if (result.error) {
				const status = result.error.code && standardErrorCodes[result.error.code];
				reply.status(status || 500).send(result.error);
				return;
			}

			if (result.value) {
				reply.status(200).send({
					widgets: result.value.widgets,
				} satisfies IGetWidgetsResponse);
			}

			throw new Error("Result must have an error or value.");
		},
	});

	fastify.route({
		url: "/widgets",
		method: "POST",
		handler: async (req, reply) => {
			const request: ICreateWidgetRequest = {};
			request.widget = req.body as IWidget;

			const result = await api.createWidget(request);
			if (result.error) {
				const status = result.error.code && standardErrorCodes[result.error.code];
				reply.status(status || 500).send(result.error);
				return;
			}

			if (result.value) {
				if (result.value.url != null) {
					reply.header("Location", result.value.url);
				}

				if (result.value.eTag != null) {
					reply.header("eTag", result.value.eTag);
				}

				if (result.value.widget) {
					reply.status(201).send(result.value.widget);
				}

				return;
			}

			throw new Error("Result must have an error or value.");
		},
	});

	fastify.route({
		url: "/widgets/:id",
		method: "GET",
		handler: async (req, reply) => {
			const request: IGetWidgetRequest = {};

			const params = req.params as Record<string, string>;
			if (typeof params.id === "string") {
				request.id = parseInt(params.id);
			}
			request.ifNotETag = req.headers["if-none-match"] as string;

			const result = await api.getWidget(request);

			if (result.error) {
				const status = result.error.code && standardErrorCodes[result.error.code];
				reply.status(status || 500).send(result.error);
				return;
			}

			if (result.value) {
				if (result.value.eTag != null) {
					reply.header("eTag", result.value.eTag);
				}

				if (result.value.widget) {
					reply.status(200).send(result.value.widget);
					return;
				}

				if (result.value.notModified) {
					reply.status(304);
					return;
				}
			}

			throw new Error("Result must have an error or value.");
		},
	});

	// create the delete route here
	fastify.route({
		url: "/widgets/:id",
		method: "DELETE",
		handler: async (req, reply) => {
			const request: IDeleteWidgetRequest = {};

			const params = req.params as Record<string, string>;
			if (typeof params.id === "string") {
				request.id = parseInt(params.id);
			}
			request.ifETag = req.headers['if-match'] as string;

			const result = await api.deleteWidget(request);

			if (result.error) {
				const status = result.error.code && standardErrorCodes[result.error.code];
				reply.status(status || 500).send(result.error);
				return;
			}

			if (result.value) {
				if (result.value.notFound) {
					reply.status(404);
					return;
				}

				if (result.value.conflict) {
					reply.status(409);
					return;
				}

				reply.status(204).send({});
				return;
			}

			throw new Error("Result must have an error or value.");
		},
	});

	fastify.route({
		url: "/widgets/get",
		method: "POST",
		handler: async (req, reply) => {
			const request: IGetWidgetBatchRequest = {};
			request.ids = req.body as number[];

			const result = await api.getWidgetBatch(request);
			if (result.error) {
				const status = result.error.code && standardErrorCodes[result.error.code];
				reply.status(status || 500).send(result.error);
				return;
			}

			if (result.value) {
				if (result.value.results) {
					reply.status(200).send(result.value.results);
					return;
				}
			}

			throw new Error("Result must have an error or value.");
		},
	});
}
