import type { GiselleNodeId } from "@/app/(playground)/p/[agentId]/prev/beta-proto/giselle-node/types";
import type { GitHubIntegrationId } from "@/app/(playground)/p/[agentId]/prev/beta-proto/github-integration/types";
import type { Graph } from "@/app/(playground)/p/[agentId]/prev/beta-proto/graph/types";
import type {
	FileId,
	KnowledgeContentId,
	KnowledgeContentType,
	KnowledgeId,
} from "@/services/agents/knowledges/types";
import type {
	Node,
	NodeGraph,
	Port,
	PortDirection,
	PortType,
} from "@/services/agents/nodes/types";
import type {
	PlaygroundEdge,
	PlaygroundGraph,
} from "@/services/agents/playground/types";
import {
	type RequestId,
	type RequestStackId,
	type RequestStatus,
	type RequestStepId,
	type RequestStepStatus,
	requestStepStatus,
} from "@/services/agents/requests/types";
import type { AgentId, BuildId } from "@/services/agents/types";
import type {
	GitHubNextAction,
	GitHubTriggerEvent,
} from "@/services/external/github/types";
import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import type { VectorStoreFile } from "openai/resources/beta/vector-stores/files";
import type { VectorStore } from "openai/resources/beta/vector-stores/vector-stores";
import type { Stripe } from "stripe";

export const subscriptions = pgTable("subscriptions", {
	// Subscription ID from Stripe, e.g. sub_1234.
	id: text("id").notNull().unique(),
	dbId: serial("db_id").primaryKey(),
	teamDbId: integer("team_db_id")
		.notNull()
		.references(() => teams.dbId),
	status: text("status").$type<Stripe.Subscription.Status>().notNull(),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull(),
	cancelAt: timestamp("cancel_at"),
	canceledAt: timestamp("canceled_at"),
	currentPeriodStart: timestamp("current_period_start").notNull(),
	currentPeriodEnd: timestamp("current_period_end").notNull(),
	created: timestamp("created").defaultNow().notNull(),
	endedAt: timestamp("ended_at"),
	trialStart: timestamp("trial_start"),
	trialEnd: timestamp("trial_end"),
});

type TeamType = "customer" | "internal";
export const teams = pgTable("teams", {
	dbId: serial("db_id").primaryKey(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
	type: text("type").$type<TeamType>().notNull().default("customer"),
});

export type UserId = `usr_${string}`;
export const users = pgTable("users", {
	id: text("id").$type<UserId>().notNull().unique(),
	email: text("email").unique(), // TODO: Allow null values initially when adding schema, then change to not null after data update
	displayName: text("display_name"),
	dbId: serial("db_id").primaryKey(),
});

export const supabaseUserMappings = pgTable("supabase_user_mappings", {
	userDbId: integer("user_db_id")
		.unique()
		.notNull()
		.references(() => users.dbId),
	supabaseUserId: text("supabase_user_id").notNull().unique(),
});

export const stripeUserMappings = pgTable("stripe_user_mappings", {
	userDbId: integer("user_db_id")
		.notNull()
		.unique()
		.references(() => users.dbId),
	stripeCustomerId: text("stripe_customer_id").notNull().unique(),
});

export type TeamRole = "admin" | "member";
export const teamMemberships = pgTable(
	"team_memberships",
	{
		id: serial("id").primaryKey(),
		userDbId: integer("user_db_id")
			.notNull()
			.references(() => users.dbId),
		teamDbId: integer("team_db_id")
			.notNull()
			.references(() => teams.dbId),
		role: text("role").notNull().$type<TeamRole>(),
	},
	(teamMembership) => ({
		teamMembershipsUserTeamUnique: unique().on(
			teamMembership.userDbId,
			teamMembership.teamDbId,
		),
	}),
);

export const agents = pgTable(
	"agents",
	{
		id: text("id").$type<AgentId>().notNull().unique(),
		dbId: serial("db_id").primaryKey(),
		teamDbId: integer("team_db_id")
			.notNull()
			.references(() => teams.dbId, { onDelete: "cascade" }),
		name: text("name"),
		graphUrl: text("graph_url"), // // TODO: add notNull constrain when new architecture released
		graphv2: jsonb("graphv2").$type<Graph>().notNull(),
		graph: jsonb("graph")
			.$type<PlaygroundGraph>()
			.notNull()
			.default({
				nodes: [],
				edges: [],
				viewport: { x: 0, y: 0, zoom: 1 },
			}),
		graphHash: text("graph_hash").unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		creatorDbId: integer("creator_db_id")
			.notNull()
			.references(() => users.dbId),
	},
	(table) => ({
		teamDbIdIdx: index().on(table.teamDbId),
	}),
);

export const builds = pgTable("builds", {
	id: text("id").$type<BuildId>().notNull().unique(),
	dbId: serial("db_id").primaryKey(),
	graph: jsonb("graph").$type<PlaygroundGraph>().notNull(),
	graphHash: text("graph_hash").notNull().unique(),
	agentDbId: integer("agent_db_id")
		.notNull()
		.references(() => agents.dbId),
	beforeId: integer("before_id"),
	after: integer("after_id"),
});
export const buildRelations = relations(builds, ({ one }) => ({
	before: one(builds, {
		fields: [builds.beforeId],
		references: [builds.id],
	}),
	after: one(builds, {
		fields: [builds.after],
		references: [builds.id],
	}),
}));

export const nodes = pgTable(
	"nodes",
	{
		id: text("id").$type<Node["id"]>().notNull(),
		dbId: serial("db_id").primaryKey(),
		buildDbId: integer("build_db_id")
			.notNull()
			.references(() => builds.dbId, { onDelete: "cascade" }),
		className: text("class_name").notNull(),
		data: jsonb("data").notNull(),
		graph: jsonb("graph").$type<NodeGraph>().notNull(),
	},
	(nodes) => ({
		nodesIdBuildDbIdUnieque: unique().on(nodes.id, nodes.buildDbId),
	}),
);

export const triggerNodes = pgTable("trigger_nodes", {
	dbId: serial("db_id").primaryKey(),
	buildDbId: integer("build_db_id")
		.notNull()
		.references(() => builds.dbId, { onDelete: "cascade" })
		.unique(),
	nodeDbId: integer("node_db_id")
		.notNull()
		.references(() => nodes.dbId, { onDelete: "cascade" }),
});

export const ports = pgTable(
	"ports",
	{
		id: text("id").$type<Port["id"]>().notNull(),
		dbId: serial("db_id").primaryKey(),
		nodeDbId: integer("node_db_id")
			.notNull()
			.references(() => nodes.dbId, { onDelete: "cascade" }),
		name: text("name").notNull(),
		direction: text("direction").$type<PortDirection>().notNull(),
		type: text("type").$type<PortType>().notNull(),
	},
	(ports) => ({
		portsIdNodeDbIdUnique: unique().on(ports.id, ports.nodeDbId),
	}),
);

export const edges = pgTable(
	"edges",
	{
		id: text("id").$type<PlaygroundEdge["id"]>().notNull(),
		dbId: serial("db_id").primaryKey(),
		buildDbId: integer("build_db_id")
			.notNull()
			.references(() => builds.dbId, { onDelete: "cascade" }),
		targetPortDbId: integer("target_port_db_id")
			.notNull()
			.references(() => ports.dbId, { onDelete: "cascade" }),
		sourcePortDbId: integer("source_port_db_id")
			.notNull()
			.references(() => ports.dbId, { onDelete: "cascade" }),
	},
	(edge) => ({
		edgesInputPortIdOutputPortIdUnique: unique().on(
			edge.targetPortDbId,
			edge.sourcePortDbId,
		),
		edgesIdBuildDbIdUnique: unique().on(edge.id, edge.buildDbId),
	}),
);

export const requests = pgTable("requests", {
	id: text("id").$type<RequestId>().notNull().unique(),
	dbId: serial("db_id").primaryKey(),
	buildDbId: integer("build_db_id")
		.notNull()
		.references(() => builds.dbId),
	status: text("status").$type<RequestStatus>().notNull().default("queued"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	startedAt: timestamp("started_at"),
	finishedAt: timestamp("finished_at"),
});
export const requestRunners = pgTable("request_runners", {
	dbId: serial("db_id").primaryKey(),
	requestDbId: integer("request_db_id")
		.notNull()
		.references(() => requests.dbId),
	provider: text("provider").notNull(),
	runnerId: text("runner_id").notNull().unique(),
});

export const requestResults = pgTable("request_results", {
	dbId: serial("db_id").primaryKey(),
	requestDbId: integer("request_db_id")
		.notNull()
		.references(() => requests.dbId)
		.unique(),
	text: text("text").notNull(),
});

export const requestStacks = pgTable("request_stacks", {
	id: text("id").$type<RequestStackId>().notNull().unique(),
	dbId: serial("db_id").primaryKey(),
	requestDbId: integer("request_db_id")
		.notNull()
		.references(() => requests.dbId),
	startNodeDbId: integer("start_node_db_id")
		.notNull()
		.references(() => nodes.dbId),
	endNodeDbId: integer("end_node_db_id")
		.notNull()
		.references(() => nodes.dbId),
});

export const requestStackRunners = pgTable("request_stack_runners", {
	dbId: serial("db_id").primaryKey(),
	requestStackDbId: integer("request_stack_db_id")
		.notNull()
		.references(() => requestStacks.dbId),
	runnerId: text("runner_id").notNull().unique(),
});

export const requestSteps = pgTable("request_steps", {
	id: text("id").$type<RequestStepId>().unique().notNull(),
	dbId: serial("db_id").primaryKey(),
	requestStackDbId: integer("request_stack_db_id")
		.notNull()
		.references(() => requestStacks.dbId),
	nodeDbId: integer("node_db_id")
		.notNull()
		.references(() => nodes.dbId),
	status: text("status")
		.$type<RequestStepStatus>()
		.notNull()
		.default(requestStepStatus.inProgress),
	startedAt: timestamp("started_at"),
	finishedAt: timestamp("finished_at"),
});
export const requestPortMessages = pgTable(
	"request_port_messages",
	{
		dbId: serial("db_id").primaryKey(),
		requestDbId: integer("request_db_id")
			.notNull()
			.references(() => requests.dbId),
		portDbId: integer("port_db_id")
			.notNull()
			.references(() => ports.dbId),
		message: jsonb("message").notNull(),
	},
	(requestPortMessage) => ({
		requestPortMessagesRequestIdPortIdUnique: unique().on(
			requestPortMessage.requestDbId,
			requestPortMessage.portDbId,
		),
	}),
);

export const oauthCredentials = pgTable(
	"oauth_credentials",
	{
		id: serial("id").primaryKey(),
		userId: integer("user_id")
			.notNull()
			.references(() => users.dbId),
		provider: text("provider").notNull(),
		providerAccountId: text("provider_account_id").notNull(),
		accessToken: text("access_token").notNull(),
		refreshToken: text("refresh_token"),
		expiresAt: timestamp("expires_at"),
		tokenType: text("token_type"),
		scope: text("scope"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		oauthCredentialsUserIdProviderProviderAccountIdUnique: unique().on(
			table.userId,
			table.provider,
			table.providerAccountId,
		),
	}),
);

export const knowledges = pgTable("knowledges", {
	id: text("id").$type<KnowledgeId>().notNull().unique(),
	dbId: serial("db_id").primaryKey(),
	name: text("name").notNull(),
	agentDbId: integer("agent_db_id")
		.notNull()
		.references(() => agents.dbId, { onDelete: "cascade" }),
});

type OpenaiVectorStoreStatus = VectorStore["status"];
export const knowledgeOpenaiVectorStoreRepresentations = pgTable(
	"knowledge_openai_vector_store_representations",
	{
		dbId: serial("db_id").primaryKey(),
		knowledgeDbId: integer("knowledge_db_id")
			.notNull()
			.references(() => knowledges.dbId, { onDelete: "cascade" }),
		openaiVectorStoreId: text("openai_vector_store_id").notNull().unique(),
		openaiVectorStoreStatus: text("status")
			.$type<OpenaiVectorStoreStatus>()
			.notNull(),
	},
);
export const files = pgTable("files", {
	id: text("id").$type<FileId>().notNull().unique(),
	dbId: serial("db_id").primaryKey(),
	fileName: text("file_name").notNull(),
	fileType: text("file_type").notNull(),
	fileSize: integer("file_size").notNull(),
	blobUrl: text("blob_url").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const fileOpenaiFileRepresentations = pgTable(
	"file_openai_file_representations",
	{
		dbId: serial("db_id").primaryKey(),
		fileDbId: integer("file_db_id")
			.notNull()
			.references(() => files.dbId, { onDelete: "cascade" }),
		openaiFileId: text("openai_file_id").notNull().unique(),
	},
);

export const knowledgeContents = pgTable(
	"knowledge_contents",
	{
		id: text("id").$type<KnowledgeContentId>().notNull().unique(),
		dbId: serial("db_id").primaryKey(),
		name: text("name").notNull(),
		type: text("knowledge_content_type")
			.$type<KnowledgeContentType>()
			.notNull(),
		knowledgeDbId: integer("knowledge_db_id")
			.notNull()
			.references(() => knowledges.dbId, { onDelete: "cascade" }),
		fileDbId: integer("file_db_id")
			.notNull()
			.references(() => files.dbId, { onDelete: "cascade" }),
	},
	(knowledgeContents) => ({
		knowledgeContentsKnowledgeDbIdFileDbIdUnique: unique().on(
			knowledgeContents.fileDbId,
			knowledgeContents.knowledgeDbId,
		),
	}),
);

export const knowledgeContentOpenaiVectorStoreFileRepresentations = pgTable(
	"knowledge_content_openai_vector_store_file_representations",
	{
		dbId: serial("db_id").primaryKey(),
		knowledgeContentDbId: integer("knowledge_content_db_id")
			.notNull()
			.unique("kcovsfr_knowledge_content_db_id_unique")
			.references(() => knowledgeContents.dbId, { onDelete: "cascade" }),
		openaiVectorStoreFileId: text("openai_vector_store_file_id")
			.notNull()
			.unique("kcovsfr_openai_vector_store_file_id_unique"),
		openaiVectorStoreFileStatus: text("openai_vector_store_status")
			.$type<VectorStoreFile["status"]>()
			.notNull(),
	},
);

export const gitHubIntegrations = pgTable(
	"github_integrations",
	{
		id: text("id").$type<GitHubIntegrationId>().notNull().unique(),
		dbId: serial("db_id").primaryKey(),
		agentDbId: integer("agent_db_id")
			.notNull()
			.references(() => agents.dbId),
		repositoryFullName: text("repository_full_name").notNull(),
		callSign: text("call_sign").notNull(),
		event: text("event").$type<GitHubTriggerEvent>().notNull(),
		startNodeId: text("start_node_id").$type<GiselleNodeId>().notNull(),
		endNodeId: text("end_node_id").$type<GiselleNodeId>().notNull(),
		nextAction: text("next_action").$type<GitHubNextAction>().notNull(),
	},
	(table) => {
		return {
			repositoryFullNameIdx: index().on(table.repositoryFullName),
		};
	},
);

export const agentActivities = pgTable(
	"agent_activities",
	{
		dbId: serial("db_id").primaryKey(),
		agentDbId: integer("agent_db_id")
			.notNull()
			.references(() => agents.dbId, { onDelete: "cascade" }),
		startedAt: timestamp("started_at").notNull(),
		endedAt: timestamp("ended_at").notNull(),
		totalDurationMs: numeric("total_duration_ms").notNull(),
		usageReportDbId: integer("usage_report_db_id").references(
			() => agentTimeUsageReports.dbId,
		),
	},
	(table) => ({
		agentDbIdIdx: index().on(table.agentDbId),
		endedAtIdx: index().on(table.endedAt),
	}),
);

export const agentTimeUsageReports = pgTable(
	"agent_time_usage_reports",
	{
		dbId: serial("db_id").primaryKey(),
		teamDbId: integer("team_db_id")
			.notNull()
			.references(() => teams.dbId, { onDelete: "cascade" }),
		accumulatedDurationMs: numeric("accumulated_duration_ms").notNull(),
		minutesIncrement: integer("minutes_increment").notNull(),
		stripeMeterEventId: text("stripe_meter_event_id").notNull(),
		timestamp: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		teamDbIdIdx: index().on(table.teamDbId),
		timestampIdx: index().on(table.timestamp),
		stripeMeterEventIdIdx: index().on(table.stripeMeterEventId),
	}),
);

export const userSeatUsageReports = pgTable(
	"user_seat_usage_reports",
	{
		dbId: serial("db_id").primaryKey(),
		teamDbId: integer("team_db_id")
			.notNull()
			.references(() => teams.dbId, { onDelete: "cascade" }),
		// Keep snapshot for audit purposes
		userDbIdList: integer("user_db_id_list").array().notNull(),
		stripeMeterEventId: text("stripe_meter_event_id").notNull(),
		timestamp: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		teamDbIdIdx: index().on(table.teamDbId),
		timestampIdx: index().on(table.timestamp),
		stripeMeterEventIdIdx: index().on(table.stripeMeterEventId),
	}),
);
