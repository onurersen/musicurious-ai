
"use client";

import { useCallback, useEffect, useState, useRef } from 'react';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    addEdge,
    Controls,
    Background,
    Connection,
    Edge,
    ReactFlowProvider,
    useReactFlow,
    MarkerType,
    Node,
    Handle,
    Position,
    type ReactFlowJsonObject,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { saveFlowCanvas, getFlowCanvas } from "@/app/actions";
import { ConfirmationModal } from "./confirmation-modal";
import { Loader2, Trash2, X as XIcon, Edit2 } from "lucide-react";

// --- Constants ---

const SONG_PARTS = [
    { label: "Intro", color: "#3b82f6" },       // blue-500
    { label: "Verse", color: "#22c55e" },       // green-500
    { label: "Pre-Chorus", color: "#eab308" },  // yellow-500
    { label: "Chorus", color: "#f97316" },      // orange-500
    { label: "Post-Chorus", color: "#ef4444" }, // red-500
    { label: "Bridge", color: "#8b5cf6" },      // violet-500
    { label: "Solo", color: "#6b7280" },        // gray-500
    { label: "Outro", color: "#06b6d4" },       // cyan-500
];

const INITIAL_NODES: Node[] = [];
const INITIAL_EDGES: Edge[] = [];

// --- Custom Node ---

const CustomSongNode = ({ data, isConnectable }: { data: { label: string; color: string; note?: string }; isConnectable: boolean }) => {
    return (
        <div style={{
            backgroundColor: '#1a1a1a',
            border: `2px solid ${data.color}`,
            color: 'white',
            borderRadius: '8px',
            padding: '10px',
            minWidth: '150px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            position: 'relative',
        }}>
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                style={{ background: '#fff', width: '10px', height: '10px' }}
            />
            <div className="font-bold text-sm">{data.label}</div>
            {data.note && (
                <div className="text-[10px] text-white/60 mt-1 max-w-[130px] truncate mx-auto">
                    {data.note}
                </div>
            )}
            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                style={{ background: '#fff', width: '10px', height: '10px' }}
            />
        </div>
    );
};

const nodeTypes = {
    songPart: CustomSongNode,
};

// --- Components ---

export function MusicalFlowCanvas({ videoId }: { videoId: number }) {
    const [initialState, setInitialState] = useState<ReactFlowJsonObject | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadCanvas() {
            const res = await getFlowCanvas(videoId);
            if (res.success && res.state) {
                // React Flow stores { nodes: [], edges: [], viewport: {} }
                setInitialState(res.state as ReactFlowJsonObject);
            }
            setIsLoading(false);
        }
        loadCanvas();
    }, [videoId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[500px] border border-white/10 rounded-xl bg-white/5">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <ReactFlowProvider>
            <div className="flex flex-col h-[700px] border border-white/10 rounded-xl overflow-hidden bg-[#1a1a1a]">
                <CanvasInternal videoId={videoId} initialState={initialState} />
            </div>
        </ReactFlowProvider>
    );
}

function CanvasInternal({ videoId, initialState }: { videoId: number, initialState: ReactFlowJsonObject | null }) {
    const reactFlowInstance = useReactFlow();
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialState?.nodes || INITIAL_NODES);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialState?.edges || INITIAL_EDGES);

    // Auto-save debounce
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Note Modal
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [noteContent, setNoteContent] = useState("");
    const [nodeLabel, setNodeLabel] = useState("");

    // Clear Confirmation
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    // --- Effects ---

    // Initial Viewport
    useEffect(() => {
        if (initialState?.viewport) {
            reactFlowInstance.setViewport(initialState.viewport);
        }
    }, [initialState, reactFlowInstance]);

    // Auto-save
    const saveData = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            const flow = reactFlowInstance.toObject();
            saveFlowCanvas(videoId, flow);
        }, 1000);
    }, [videoId, reactFlowInstance]);

    useEffect(() => {
        saveData();
    }, [nodes, edges, saveData]);

    // --- Handlers ---

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({
            ...params,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#ffffff', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff' },
        }, eds)),
        [setEdges],
    );

    const onDragStart = (event: React.DragEvent, nodeType: string, label: string, color: string) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label, color }));
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const reactFlowBounds = wrapperRef.current?.getBoundingClientRect();
            const dataStr = event.dataTransfer.getData('application/reactflow');

            if (!dataStr || !reactFlowBounds) return;

            const data = JSON.parse(dataStr);
            console.log("Dropped data:", data);

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: `${data.label}-${Date.now()}`,
                type: 'songPart', // Changed from 'default' to 'songPart'
                position,
                data: { label: data.label, note: '', color: data.color },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes],
    );

    const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
        setEditingNodeId(node.id);
        setNodeLabel(node.data.label as string);
        setNoteContent((node.data.note as string) || "");
        setIsNoteModalOpen(true);
    }, []);

    const saveNote = () => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === editingNodeId) {
                    // Update label to show note indicator if needed, or just allow storing hidden meta
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            label: nodeLabel, // Allow renaming part
                            note: noteContent
                        },
                        style: {
                            ...node.style,
                            // visual hint if note exists?
                            borderWidth: noteContent ? '4px' : '2px', // slight visual change
                        },
                    };
                }
                return node;
            })
        );
        setIsNoteModalOpen(false);
    };

    // Hover Note State
    const [hoveredNote, setHoveredNote] = useState<string | null>(null);

    const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
        if (node.data.note) {
            setHoveredNote(node.data.note as string);
        }
    }, []);

    const onNodeMouseLeave = useCallback(() => {
        setHoveredNote(null);
    }, []);

    return (
        <div className="flex flex-col h-full w-full relative">
            {/* Toolbar */}
            <div className="bg-[#2a2a2a] p-3 border-b border-white/5 flex items-center justify-between">
                {/* ... existing toolbar content ... */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-xs font-semibold text-white/50 uppercase mr-2">Drag Parts:</span>
                    {SONG_PARTS.map((part) => (
                        <div
                            key={part.label}
                            draggable
                            onDragStart={(e) => onDragStart(e, 'default', part.label, part.color)}
                            className="px-3 py-1.5 rounded-md text-xs font-medium text-white cursor-grab active:cursor-grabbing select-none whitespace-nowrap border border-white/5 transition-colors"
                            style={{ backgroundColor: `${part.color}40`, borderColor: part.color }} // 40 is hex opacity
                        >
                            {part.label}
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => setIsClearModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-medium rounded-md transition-colors border border-red-500/20"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Flow
                </button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative" ref={wrapperRef}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onNodeMouseEnter={onNodeMouseEnter}
                    onNodeMouseLeave={onNodeMouseLeave}
                    fitView
                    zoomOnScroll={false}
                    attributionPosition="bottom-right"
                    proOptions={{ hideAttribution: true }} // Hide if pro, or just keeping clean
                >
                    <Background color="#444" gap={16} size={1} />
                    <Controls className="bg-white/10 border border-white/10 text-black rounded-lg overflow-hidden" />
                </ReactFlow>

                {/* Instructions Overlay */}
                <div className="absolute bottom-4 right-4 z-[100] pointer-events-none opacity-60 hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm p-3 rounded-lg border border-white/10 text-xs text-white/80 space-y-1">
                    <p className="font-semibold text-white mb-1">How to use:</p>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        <span>Drag parts from top bar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                        <span>Connect dots to link flow</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                        <span>Double-click to add notes</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                        <span>Select & Backspace to delete</span>
                    </div>
                </div>

                {/* Floating Note Display */}
                {hoveredNote && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
                        <div className="bg-black/80 backdrop-blur-md border border-white/20 text-white rounded-xl px-4 py-3 shadow-2xl max-w-sm text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <div className="text-xs font-semibold text-white/50 mb-1 uppercase tracking-wider">Note</div>
                            <div className="text-sm font-medium leading-relaxed">{hoveredNote}</div>
                        </div>
                    </div>
                )}
            </div>



            {/* Modals */}
            <ConfirmationModal
                isOpen={isClearModalOpen}
                title="Clear Musical Flow"
                message="Are you sure you want to clear the entire canvas? This action cannot be undone."
                confirmLabel="Clear Canvas"
                isDestructive
                onConfirm={() => {
                    setNodes([]);
                    setEdges([]);
                    setIsClearModalOpen(false);
                }}
                onCancel={() => setIsClearModalOpen(false)}
            />

            {isNoteModalOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pointer-events-auto"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden p-6 relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsNoteModalOpen(false)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>

                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-purple-500" />
                            Edit Part
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-white/50 mb-1 block">Label</label>
                                <input
                                    value={nodeLabel}
                                    onChange={(e) => setNodeLabel(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-white/50 mb-1 block">Note</label>
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value.slice(0, 200))}
                                    placeholder="Add a note... (max 200 chars)"
                                    className="w-full h-24 bg-black/40 border border-white/10 rounded-md p-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                                />
                                <div className="text-right text-xs text-white/40">
                                    {noteContent.length}/200
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setIsNoteModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveNote}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
