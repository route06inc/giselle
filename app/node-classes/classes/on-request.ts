import type { Port } from "../type";

export const name = "onRequest";

export const label = "On Request";

export const outputPorts: Port[] = [{ type: "execution" }];

export const features = [{ class: "dynamicOutputPort" }];
