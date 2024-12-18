"use client";

import {
	Background,
	BackgroundVariant,
	Panel,
	ReactFlow,
	SelectionMode,
	useReactFlow,
	useUpdateNodeInternals,
} from "@xyflow/react";
import bg from "./bg.png";
import "@xyflow/react/dist/style.css";
import { useEffect, useState } from "react";
import { useGraph } from "../contexts/graph";
import { useMousePosition } from "../contexts/mouse-position";
import { usePropertiesPanel } from "../contexts/properties-panel";
import { useToast } from "../contexts/toast";
import { useToolbar } from "../contexts/toolbar";
import { createNodeId, isTextGeneration } from "../lib/utils";
import type { NodeId, Tool } from "../types";
import { Edge } from "./edge";
import { Header } from "./header";
import { KeyboardShortcut } from "./keyboard-shortcut";
import { NavigationPanel } from "./navigation-panel";
import { Node, PreviewNode } from "./node";
import { PropertiesPanel } from "./properties-panel";
import { Toast } from "./toast";
import { Toolbar } from "./toolbar";

const nodeTypes = {
	giselleNode: Node,
};
const edgeTypes = {
	giselleEdge: Edge,
};
export function Editor() {
	const { graph, dispatch } = useGraph();
	const { selectTool, selectedTool, reset } = useToolbar();
	const reactFlowInstance = useReactFlow<Node, Edge>();
	const updateNodeInternals = useUpdateNodeInternals();
	useEffect(() => {
		const currentNodes = reactFlowInstance.getNodes();
		reactFlowInstance.setNodes(
			graph.nodes.map((node) => {
				const currentNode = currentNodes.find(
					(currentNode) => currentNode.id === node.id,
				);
				return {
					...currentNode,
					id: node.id,
					type: "giselleNode",
					position: node.position,
					selected: node.selected,
					selectable: selectedTool.category === "move",
					draggable: selectedTool.category === "move",
					data: {
						node,
					},
				} as Node;
			}),
		);
		updateNodeInternals(graph.nodes.map((node) => node.id));
	}, [
		graph.nodes,
		reactFlowInstance.getNodes,
		reactFlowInstance.setNodes,
		updateNodeInternals,
		selectedTool,
	]);

	useEffect(() => {
		reactFlowInstance.setEdges(
			graph.connections.map(
				(connection) =>
					({
						id: connection.id,
						type: "giselleEdge",
						source: connection.sourceNodeId,
						target: connection.targetNodeId,
						targetHandle: connection.targetNodeHandleId,
						selectable: false,
						deletable: false,
						data: {
							connection,
						},
					}) satisfies Edge,
			),
		);
	}, [graph.connections, reactFlowInstance.setEdges]);
	const { setTab, setOpen } = usePropertiesPanel();
	const { toasts } = useToast();
	return (
		<div className="w-full h-screen">
			<ReactFlow<Node, Edge>
				className="giselle-flow"
				data-floating-node={selectedTool?.category === "edit"}
				colorMode="dark"
				defaultNodes={[]}
				defaultEdges={[]}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				onNodesChange={(nodesChange) => {
					nodesChange.map((nodeChange) => {
						switch (nodeChange.type) {
							case "select": {
								const node = graph.nodes.find(
									(node) => node.id === nodeChange.id,
								);
								if (node === undefined) {
									return;
								}
								// selectNode(node.id, nodeChange.selected);
								dispatch({
									type: "updateNodeSelection",
									input: {
										nodeId: node.id,
										selected: nodeChange.selected,
									},
								});
								if (nodeChange.selected) {
									setOpen(true);
									switch (node.content.type) {
										case "textGeneration":
											setTab("Prompt");
											break;
										case "text":
											setTab("Text");
											break;
										case "file":
											setTab("File");
											break;
										default:
											break;
									}
								}
								break;
							}
							case "remove": {
								const removeNode = graph.nodes.find(
									(node) => node.id === nodeChange.id,
								);
								if (removeNode === undefined) {
									return;
								}
								const incomingConnections = graph.connections.filter(
									(connection) => connection.sourceNodeId === removeNode.id,
								);
								incomingConnections.map((incomingConnection) => {
									dispatch({
										type: "removeConnection",
										input: {
											connectionId: incomingConnection.id,
										},
									});
								});
								const dependentNodes = graph.nodes.filter((node) =>
									incomingConnections.some(
										(conn) => conn.targetNodeId === node.id,
									),
								);
								dependentNodes.map((dependentNode) => {
									const handleIds = incomingConnections
										.filter(
											(incomingConnection) =>
												incomingConnection.targetNodeId === dependentNode.id,
										)
										.map(
											(incomingConnection) =>
												incomingConnection.targetNodeHandleId,
										);
									if (isTextGeneration(dependentNode)) {
										dispatch({
											type: "updateNode",
											input: {
												nodeId: dependentNode.id,
												node: {
													...dependentNode,
													content: {
														...dependentNode.content,
														requirement: handleIds.includes(
															dependentNode.content.requirement?.id,
														)
															? undefined
															: dependentNode.content.requirement,
														sources: dependentNode.content.sources.filter(
															(source) => !handleIds.includes(source.id),
														),
													},
												},
											},
										});
									}
								});
								dispatch({
									type: "removeNode",
									input: {
										nodeId: removeNode.id,
									},
								});
								break;
							}
						}
					});
				}}
				onNodeDragStop={(_event, _node, nodes) => {
					nodes.map((node) => {
						dispatch({
							type: "updateNodePosition",
							input: {
								nodeId: node.id as NodeId,
								position: node.position,
							},
						});
					});
				}}
				panOnScroll
				selectionOnDrag
				panOnDrag={false}
				selectionMode={SelectionMode.Partial}
				onPaneClick={(event) => {
					event.preventDefault();
					const position = reactFlowInstance.screenToFlowPosition({
						x: event.clientX,
						y: event.clientY,
					});
					switch (selectedTool?.action) {
						case "addTextNode":
							dispatch({
								type: "addNode",
								input: {
									node: {
										id: createNodeId(),
										name: `Untitle node - ${graph.nodes.length + 1}`,
										position,
										selected: false,
										type: "variable",
										content: {
											type: "text",
											text: "",
										},
									},
								},
							});
							break;
						case "addFileNode":
							dispatch({
								type: "addNode",
								input: {
									node: {
										id: createNodeId(),
										name: `Untitle node - ${graph.nodes.length + 1}`,
										position,
										selected: false,
										type: "variable",
										content: {
											type: "files",
											data: [],
										},
									},
								},
							});
							break;
						case "addTextGenerationNode":
							dispatch({
								type: "addNode",
								input: {
									node: {
										id: createNodeId(),
										name: `Untitle node - ${graph.nodes.length + 1}`,
										position,
										selected: false,
										type: "action",
										content: {
											type: "textGeneration",
											llm: "anthropic:claude-3-5-sonnet-latest",
											temperature: 0.7,
											topP: 1,
											instruction: "Write a short story about a cat",
											sources: [],
										},
									},
								},
							});
							break;
					}
					reset();
				}}
			>
				<Background
					className="!bg-black-100"
					lineWidth={0}
					variant={BackgroundVariant.Lines}
					style={{
						backgroundImage: `url(${bg.src})`,
						backgroundPositionX: "center",
						backgroundPositionY: "center",
						backgroundSize: "cover",
					}}
				/>

				<Panel position="top-left" className="!top-0 !left-0 !right-0 !m-0">
					<Header />
				</Panel>
				<Panel position="top-right" className="!top-0 !bottom-0 !right-0 !m-0">
					<PropertiesPanel />
				</Panel>
				<Panel position={"bottom-center"}>
					<Toolbar />
				</Panel>

				<Panel position="top-left" className="!top-0 !bottom-0 !left-0 !m-0">
					<NavigationPanel />
				</Panel>
				{selectedTool?.category === "edit" && (
					<FloatingNodePreview tool={selectedTool} />
				)}
			</ReactFlow>
			<KeyboardShortcut />
			{toasts.map(({ id, ...props }) => (
				<Toast key={id} {...props} />
			))}
		</div>
	);
}

const FloatingNodePreview = ({
	tool,
}: {
	tool: Tool;
}) => {
	const mousePosition = useMousePosition();

	return (
		<>
			<div
				className="fixed pointer-events-none inset-0"
				style={{
					transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
				}}
			>
				<div className="w-[180px]">
					<PreviewNode tool={tool} />
				</div>
			</div>
		</>
	);
};
