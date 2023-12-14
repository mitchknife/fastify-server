import { FastifyPluginAsync } from "fastify";
import type { IConformanceApi, IGetApiInfoRequest, IGetWidgetsRequest, IGetWidgetRequest, IGetWidgetsResponse, ICreateWidgetRequest, IWidget, IDeleteWidgetRequest, IGetWidgetBatchRequest, IMirrorFieldsRequest, ICheckQueryRequest, Answer, ICheckPathRequest } from "./conformanceApiTypes";

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

function parseBoolean(value: string | undefined) {
	if (typeof value === 'string') {
		const lowerValue = value.toLowerCase();
		if (lowerValue === 'true') {
			return true;
		}
		if (lowerValue === 'false') {
			return false;
		}
	}
	return undefined;
}

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

	fastify.route({
		url: "/mirrorFields",
		method: "POST",
		handler: async (req, reply) => {
			const request: IMirrorFieldsRequest = {};
			request.field = (req.body as IMirrorFieldsRequest).field;
			request.matrix = (req.body as IMirrorFieldsRequest).matrix;

			const result = await api.mirrorFields(request);

			if (result.error) {
				const status = result.error.code && standardErrorCodes[result.error.code];
				reply.status(status || 500).send(result.error);
				return;
			}

			if (result.value) {
				reply.status(200).send(result.value);
				return;
			}

			throw new Error("Result must have an error or value.");
		},
	});

	fastify.route({
		url: "/checkQuery",
		method: "GET",
		handler: async (req, reply) => {
			const request: ICheckQueryRequest = {};
			const query = req.query as Record<string, string>;

			if (typeof query["string"] === "string") {
				request.string = query["string"];
			}
			if (typeof query["boolean"] === "string") {
				request.boolean = parseBoolean(query["boolean"]);
			}
			if (typeof query["double"] === "string") {
				request.double = parseFloat(query["double"]);
			}
			if (typeof query["int32"] === "string") {
				request.int32 = parseInt(query["int32"]);
			}
			if (typeof query["int64"] === "string") {
				request.int64 = parseInt(query["int64"]);
			}
			if (typeof query["decimal"] === "string") {
				request.decimal = parseFloat(query["decimal"]);
			}
			if (typeof query["enum"] === "string") {
				request.enum = query["enum"] as Answer;
			}
			if (typeof query["datetime"] === "string") {
				request.datetime = query["datetime"];
			}

			const result = await api.checkQuery(request);

			if (result.error) {
				const status = result.error.code && standardErrorCodes[result.error.code];
				reply.status(status || 500).send(result.error);
				return;
			}

			if (result.value) {
				reply.status(200).send(result.value);
			}

			throw new Error("Result must have an error or value.");
		},
	});

	fastify.route({
		url: "/checkPath/:string/:boolean/:double/:int32/:int64/:decimal/:enum/:datetime",
		method: "GET",
		handler: async (req, reply) => {
			const request: ICheckPathRequest = {};
			const params = req.params as Record<string, string>;

			if (typeof params["string"] === "string") {
				request.string = params["string"];
			}
			if (typeof params["boolean"] === "string") {
				request.boolean = parseBoolean(params["boolean"]);
			}
			if (typeof params["double"] === "string") {
				request.double = parseFloat(params["double"]);
			}
			if (typeof params["int32"] === "string") {
				request.int32 = parseInt(params["int32"]);
			}
			if (typeof params["int64"] === "string") {
				request.int64 = parseInt(params["int64"]);
			}
			if (typeof params["decimal"] === "string") {
				request.decimal = parseFloat(params["decimal"]);
			}
			if (typeof params["enum"] === "string") {
				request.enum = params["enum"] as Answer;
			}
			if (typeof params["datetime"] === "string") {
				request.datetime = params["datetime"];
			}

			const result = await api.checkPath(request);

			if (result.error) {
				const status = result.error.code && standardErrorCodes[result.error.code];
				reply.status(status || 500).send(result.error);
				return;
			}

			if (result.value) {
				reply.status(200).send(result.value);
			}

			throw new Error("Result must have an error or value.");
		}
	});
}
