import {
  useProgrammingStore,
  ConnectionData,
  ConnectionDirection,
  BlockData,
  BlockSpec,
  MetaType,
} from "@people_and_robots/open-core";
import { styled } from "@mui/material";
import { Handle, Position, HandleType, OnConnectStartParams } from "reactflow";
import { ProgrammingState } from "@people_and_robots/open-core";

interface StyledHandleProps {
  focused: boolean;
}
const StyledHandle = styled(Handle, {
  shouldForwardProp: (prop: string) => !["focused"].includes(prop),
})<StyledHandleProps>(({ theme, focused }) => ({
  boxShadow: focused
    ? `0pt 0pt 0pt 2pt ${theme.palette.primary.main}`
    : undefined,
  backgroundColor: focused ? theme.palette.primary.main : "grey",
  opacity: focused ? 1 : 0.5,
}));

const handleTypeToDirection = (handleType: HandleType) =>
  handleType === "target"
    ? ConnectionDirection.Inbound
    : ConnectionDirection.Outbound;

interface ConnectionInfoAugment {
  nodeType: string;
  connectionSpec: {
    direction: ConnectionDirection;
    allowed: string[];
  };
  existing: ConnectionData[];
}
const checkValid = (
  connectionInfo: (OnConnectStartParams & ConnectionInfoAugment) | null,
  nodeData: BlockData,
  direction: ConnectionDirection,
  position: Position,
  validateEdge: (
    source: string,
    sourceHandle: Position,
    target: string,
    targetHandle: Position,
  ) => boolean,
) => {
  if (!connectionInfo) {
    // No connection being formed, so not valid
    return false;
  } else if (
    connectionInfo.handleType &&
    direction === handleTypeToDirection(connectionInfo.handleType)
  ) {
    // Targets need to match with Sources
    return false;
  }
  const otherIsTarget = connectionInfo.handleType === "target";
  const target = otherIsTarget ? connectionInfo.nodeId : nodeData.id || "";
  const targetHandle = otherIsTarget
    ? connectionInfo.handleId
    : position || Position.Top;
  const source = otherIsTarget ? nodeData.id : connectionInfo.nodeId || "";
  const sourceHandle = otherIsTarget
    ? position
    : connectionInfo.handleId || Position.Top;
  // @ts-ignore (We know this is valid because the source handles in our cases are always position codes)
  return validateEdge(source, sourceHandle, target, targetHandle);
};

export interface ConnectionHandleProps {
  nodeData: BlockData;
  position?: Position;
  direction?: ConnectionDirection;
  blockSpec: BlockSpec;
}
export const ConnectionHandle = ({
  nodeData,
  position = Position.Top,
  direction = ConnectionDirection.Inbound,
  blockSpec,
}: ConnectionHandleProps) => {
  const validateEdge = useProgrammingStore(
    (state: ProgrammingState) => state.validateEdge,
  );
  const connectionInfo: (OnConnectStartParams & ConnectionInfoAugment) | null =
    useProgrammingStore((state: ProgrammingState) => {
      if (state.connectionInfo?.nodeId && state.connectionInfo?.handleId) {
        const node = state.programData[state.connectionInfo.nodeId];
        const nodeType = node.type;
        return {
          ...state.connectionInfo,
          nodeType,
          connectionSpec: blockSpec?.connections?.[
            state.connectionInfo.handleId as Position
          ] || { direction: ConnectionDirection.Inbound, allowed: [] },
          existing: Object.values(state.programData).filter(
            (d) => d.metaType === MetaType.Connection,
          ) as ConnectionData[],
        };
      } else {
        return null;
      }
    });
  const isValidConnectionOption = checkValid(
    connectionInfo,
    nodeData,
    direction,
    position,
    validateEdge,
  );
  return (
    <StyledHandle
      isConnectable={!connectionInfo || isValidConnectionOption}
      id={position}
      position={position}
      type={direction === ConnectionDirection.Inbound ? "target" : "source"}
      focused={isValidConnectionOption}
    />
  );
};
