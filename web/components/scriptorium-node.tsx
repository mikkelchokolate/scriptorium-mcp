"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";

import type { GraphNodeDataDTO } from "@/lib/types";

type ScriptoriumFlowNode = Node<GraphNodeDataDTO, "scriptorium">;

const handleStyle = {
  opacity: 0,
  pointerEvents: "none" as const,
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  border: 0,
  padding: 0,
  background: "transparent",
};

const HANDLE_OFFSET = 8;

function handleStyleFor(position: Position) {
  switch (position) {
    case Position.Left:
      return { ...handleStyle, left: -HANDLE_OFFSET };
    case Position.Right:
      return { ...handleStyle, right: -HANDLE_OFFSET };
    case Position.Top:
      return { ...handleStyle, top: -HANDLE_OFFSET };
    case Position.Bottom:
      return { ...handleStyle, bottom: -HANDLE_OFFSET };
    default:
      return handleStyle;
  }
}

export function ScriptoriumNode({ data, selected }: NodeProps<ScriptoriumFlowNode>) {
  const isSelected = selected || Boolean(data.isSelected);

  return (
    <div className={`node-shell ${isSelected ? "node-shell--highlighted" : ""}`}>
      <Handle id="target-left" position={Position.Left} type="target" style={handleStyleFor(Position.Left)} />
      <Handle id="target-right" position={Position.Right} type="target" style={handleStyleFor(Position.Right)} />
      <Handle id="target-top" position={Position.Top} type="target" style={handleStyleFor(Position.Top)} />
      <Handle id="target-bottom" position={Position.Bottom} type="target" style={handleStyleFor(Position.Bottom)} />
      <Handle id="source-left" position={Position.Left} type="source" style={handleStyleFor(Position.Left)} />
      <Handle id="source-right" position={Position.Right} type="source" style={handleStyleFor(Position.Right)} />
      <Handle id="source-top" position={Position.Top} type="source" style={handleStyleFor(Position.Top)} />
      <Handle id="source-bottom" position={Position.Bottom} type="source" style={handleStyleFor(Position.Bottom)} />
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
    </div>
  );
}
