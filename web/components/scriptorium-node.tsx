"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";

import type { GraphNodeDataDTO } from "@/lib/types";

type ScriptoriumFlowNode = Node<GraphNodeDataDTO, "scriptorium">;

export function ScriptoriumNode({ data, selected }: NodeProps<ScriptoriumFlowNode>) {
  return (
    <div className={`node-shell ${selected ? "node-shell--highlighted" : ""}`}>
      <Handle position={Position.Left} type="target" style={{ opacity: 0 }} />
      <div className="badge-row">
        <span className={`kind-chip ${data.source === "neo4j" ? "kind-chip--neo4j" : ""}`}>{data.kind}</span>
        {data.chapter ? <span className="tag">Ch. {data.chapter}</span> : null}
      </div>
      <h3>{data.label.value}</h3>
      {data.subtitle ? <p>{data.subtitle.value}</p> : null}
      {data.description ? <p>{data.description.value}</p> : null}
      <div className="badge-row">
        {data.temporal?.start || data.temporal?.chapterSpanStart ? (
          <span className="tag">
            {data.temporal.start ? data.temporal.start : `Ch. ${data.temporal.chapterSpanStart}`}
          </span>
        ) : null}
        {data.causal?.forecastHorizonChapters ? (
          <span className="tag">+{data.causal.forecastHorizonChapters}</span>
        ) : null}
      </div>
      <Handle position={Position.Right} type="source" style={{ opacity: 0 }} />
    </div>
  );
}
