import * as Tabs from "@radix-ui/react-tabs";
import { useMemo } from "react";
import { ArtifactRender } from "./artifact/render";
import bg from "./bg.png";
import { CircleCheckIcon } from "./components/icons/circle-check";
import { CircleXIcon } from "./components/icons/circle-x";
import { WilliIcon } from "./components/icons/willi";
import { stepStatuses } from "./flow/types";
import { useGraph } from "./graph/context";
import { Header } from "./header";
import { StepItem } from "./viewer/components/step-item";

export function Viewer() {
	const { state } = useGraph();
	const nodeIndexes = useMemo(
		() => Object.fromEntries(state.graph.nodes.map((node) => [node.id, node])),
		[state.graph.nodes],
	);
	return (
		<div
			className="w-full h-screen bg-black-100 flex flex-col"
			style={{
				backgroundImage: `url(${bg.src})`,
				backgroundPositionX: "center",
				backgroundPositionY: "center",
				backgroundSize: "cover",
			}}
		>
			<Header />
			<div className="flex-1 flex flex-col items-center divide-y mx-[20px] overflow-hidden">
				<div className="flex items-center h-[40px]">
					{state.flow == null ? (
						<div className="text-black-70 font-[800] text-[18px]">No exist</div>
					) : (
						<div className="text-black-70 font-[800] text-[18px]">
							{/* {state.flow.finalNodeId} */}
						</div>
					)}
				</div>
				{state.flow == null ? (
					<div className="flex-1 w-full flex items-center justify-center">
						<div className="flex flex-col items-center gap-[8px]">
							<WilliIcon className="fill-black-70 w-[32px] h-[32px]" />
							<p className="font-[800] text-black-30">
								This has not yet been executed
							</p>
							<p className="text-black-70 text-[12px] text-center leading-5">
								You have not yet executed the node. <br />
								Let's execute the entire thing and create the final output.
							</p>
						</div>
					</div>
				) : (
					<Tabs.Root className="flex-1 flex w-full gap-[16px] pt-[16px] overflow-hidden">
						<div className="w-[200px]">
							<Tabs.List className="flex flex-col gap-[8px]">
								{state.flow.jobs.map((actionLayer, index) => (
									<div key={actionLayer.id}>
										<p className="text-[12px] text-black-30 mb-[4px]">
											Step {index + 1}
										</p>
										<div className="flex flex-col gap-[4px]">
											{actionLayer.steps.map((step) => (
												<Tabs.Trigger key={step.id} value={step.id} asChild>
													<StepItem
														key={step.id}
														step={step}
														node={nodeIndexes[step.node.id]}
													/>
												</Tabs.Trigger>
											))}
										</div>
									</div>
								))}
							</Tabs.List>
						</div>
						<div className="overflow-y-scroll flex-1">
							{state.flow.jobs.flatMap((job) =>
								job.steps
									.filter(
										(step) =>
											step.status === stepStatuses.streaming ||
											step.status === stepStatuses.completed,
									)
									.map((step) => (
										<Tabs.Content key={step.id} value={step.id}>
											{step.output.object === "artifact.text" ? (
												<ArtifactRender
													title={step.output.title}
													content={step.output.content}
												/>
											) : (
												<div className="px-[16px] py-[16px] font-rosart text-[18px] text-black-30">
													<table className="w-full divide-y divide-black-40 font-avenir border-separate border-spacing-[16px] text-left text-black-70 ">
														<colgroup>
															<col width="0%" />
															<col width="100%" />
															<col width="0%" />
														</colgroup>
														<thead className="font-[500] text-[12px]">
															<tr>
																<th>Status</th>
																<th>Content</th>
																<th>Relevance</th>
															</tr>
														</thead>
														<tbody className="">
															{step.output.scrapingTasks.map((scrapingTask) => (
																<tr key={scrapingTask.id}>
																	<td>
																		{scrapingTask.state === "completed" ? (
																			<CircleCheckIcon className="w-[20px] h-[20px] fill-green" />
																		) : scrapingTask.state === "failed" ? (
																			<CircleXIcon className="w-[20px] h-[20px] fill-[hsla(11,100%,50%,1)]" />
																		) : (
																			""
																		)}
																	</td>
																	<td className="text-black-30 max-w-[1px]">
																		<p className="font-rosart text-[18px] underline truncate">
																			{scrapingTask.title}
																		</p>
																		<p className="text-[12px] truncate">
																			{scrapingTask.url}
																		</p>
																	</td>
																	<td className="text-green font-[900]">
																		{Math.min(
																			0.99,
																			Number.parseFloat(
																				scrapingTask.relevance.toFixed(2),
																			),
																		)}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											)}
										</Tabs.Content>
									)),
							)}
						</div>
					</Tabs.Root>
				)}
			</div>
		</div>
	);
}
