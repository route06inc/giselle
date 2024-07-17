import type { Node } from "@/app/agents/blueprints";
import { type NodeClassName, getNodeClass } from "@/app/node-classes";
import {
	blueprints as blueprintsSchema,
	db,
	nodesBlueprints as nodesBlueprintsSchema,
	nodes as nodesSchema,
	ports as portsSchema,
} from "@/drizzle";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import invariant from "tiny-invariant";

export type Payload = {
	node: {
		className: NodeClassName;
		position: { x: number; y: number };
	};
};

type AssertPayload = (json: unknown) => asserts json is Payload;
/**
 * @todo Implement this function
 */
const assertPayload: AssertPayload = (json) => {};

export const POST = async (
	request: Request,
	{ params }: { params: { blueprintId: string } },
) => {
	const payload = await request.json();
	assertPayload(payload);
	const blueprint = await db.query.blueprints.findFirst({
		where: eq(blueprintsSchema.id, Number.parseInt(params.blueprintId, 10)),
	});
	invariant(blueprint != null, `Blueprint not found: ${params.blueprintId}`);
	const nodeClass = getNodeClass(payload.node.className);
	const [node] = await db
		.insert(nodesSchema)
		.values({
			agentId: blueprint.agentId,
			className: nodeClass.name,
			position: payload.node.position,
		})
		.returning({
			id: nodesSchema.id,
		});
	const inputPorts: (typeof portsSchema.$inferInsert)[] = (
		nodeClass.inputPorts ?? []
	).map((port, index) => ({
		nodeId: node.id,
		type: port.type,
		direction: "input",
		order: index,
		name: port.label ?? "",
	}));
	const outputPorts: (typeof portsSchema.$inferInsert)[] = (
		nodeClass.outputPorts ?? []
	).map((port, index) => ({
		nodeId: node.id,
		type: port.type,
		direction: "output",
		order: index,
		name: port.label ?? "",
	}));
	const ports = await db
		.insert(portsSchema)
		.values([...inputPorts, ...outputPorts])
		.returning({
			insertedId: portsSchema.id,
		});
	await db.insert(nodesBlueprintsSchema).values({
		nodeId: node.id,
		blueprintId: blueprint.id,
	});
	await db
		.update(blueprintsSchema)
		.set({ dirty: true })
		.where(eq(blueprintsSchema.id, Number.parseInt(params.blueprintId)));
	return NextResponse.json<{ node: Node }>({
		node: {
			id: node.id,
			position: payload.node.position,
			className: payload.node.className,
			inputPorts: inputPorts.map((port, index) => ({
				...port,
				id: ports[index].insertedId,
			})),
			outputPorts: outputPorts.map((port, index) => ({
				...port,
				id: ports[index].insertedId,
			})),
		},
	});
};
