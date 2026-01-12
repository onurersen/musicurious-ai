
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

import { saveFlowCanvas, getFlowCanvas, logClientEvent } from "@/app/actions";
import { getChordShape } from "./chord-display";
import { ConfirmationModal } from "./confirmation-modal";
import { DownloadOptionsModal } from "./download-options-modal";
import { Loader2, Trash2, X as XIcon, Edit2, Download } from "lucide-react";
import { jsPDF } from "jspdf";

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

// Update Props
interface MusicalFlowCanvasProps {
    videoId: number;
    extractedSections?: { id: number; title: string; start_time: number; end_time: number; chord_adjustments?: Record<string, { action: 'rename' | 'hide', to?: string }>; added_chords?: string[] }[];
    jamTitle: string;
    chordsTimeline: { chord: string; start: number; end: number }[];
    impersonatedUserId?: string;
}

export function MusicalFlowCanvas({ videoId, extractedSections = [], jamTitle, chordsTimeline = [], impersonatedUserId }: MusicalFlowCanvasProps) {
    const [initialState, setInitialState] = useState<ReactFlowJsonObject | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getFlowCanvas(videoId).then((res) => {
            if (res.success && res.state) {
                setInitialState(res.state as ReactFlowJsonObject);
            }
            setIsLoading(false);
        });
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
                <CanvasInternal
                    videoId={videoId}
                    initialState={initialState}
                    extractedSections={extractedSections}
                    jamTitle={jamTitle}
                    chordsTimeline={chordsTimeline}
                    impersonatedUserId={impersonatedUserId}
                />
            </div>
        </ReactFlowProvider>
    );
}

function CanvasInternal({ videoId, initialState, extractedSections, jamTitle, chordsTimeline, impersonatedUserId }: {
    videoId: number,
    initialState: ReactFlowJsonObject | null,
    extractedSections: { id: number; title: string; start_time: number; end_time: number; chord_adjustments?: Record<string, { action: 'rename' | 'hide', to?: string }>; added_chords?: string[] }[],
    jamTitle: string,
    chordsTimeline: { chord: string; start: number; end: number }[],
    impersonatedUserId?: string
}) {
    const reactFlowInstance = useReactFlow();
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialState?.nodes || INITIAL_NODES);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialState?.edges || INITIAL_EDGES);

    // Auto-save debounce
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync Node Labels with Renamed Sections
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.data.extractedSectionId) {
                    const section = extractedSections.find(s => s.id === Number(node.data.extractedSectionId));
                    if (section) {
                        const currentSynced = node.data.syncedSectionTitle as string | undefined;

                        // Case 1: First time sync (legacy nodes or new link)
                        if (currentSynced === undefined) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    syncedSectionTitle: section.title
                                    // Do NOT touch label, preserve manual edits
                                }
                            };
                        }

                        // Case 2: Section was renamed on backend
                        if (currentSynced !== section.title) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    label: section.title, // Sync label
                                    syncedSectionTitle: section.title // Update sync tracker
                                }
                            };
                        }
                    }
                }
                return node;
            })
        );
    }, [extractedSections, setNodes]);

    // Note Modal
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [noteContent, setNoteContent] = useState("");
    const [nodeLabel, setNodeLabel] = useState("");

    // Clear Confirmation
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    // Download Options Modal
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

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
            saveFlowCanvas(videoId, flow, impersonatedUserId);
        }, 1000);
    }, [videoId, reactFlowInstance, impersonatedUserId]);

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

    const handleDownloadPDF = useCallback(async ({ showChordNames, showChordDiagrams }: { showChordNames: boolean; showChordDiagrams: boolean }) => {

        await logClientEvent('DOWNLOAD_FLOW_PDF', {
            videoId,
            jamTitle,
            options: { showChordNames, showChordDiagrams }
        });

        const doc = new jsPDF();

        // Helper to draw a chord diagram
        const drawChordDiagram = (doc: jsPDF, x: number, y: number, chordName: string, shape: any) => {
            const scale = 0.4; // Scale down the diagram
            // Dimensions based on standard react-chords style approx
            const width = 50 * scale;
            const height = 60 * scale;
            const originX = x;
            const originY = y + 5; // Space for name

            // Draw Chord Name
            if (showChordNames) {
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(chordName, x + (width / 2), y, { align: 'center' });
            }

            if (!shape) {
                // Draw skeleton if no shape
                doc.setDrawColor(200);
                doc.rect(originX, originY, width, height);
                return;
            }

            const numStrings = 6;
            const numFrets = 5; // Standard box height
            const stringSpacing = width / (numStrings - 1);
            const fretSpacing = height / numFrets;

            doc.setLineWidth(0.2);
            doc.setDrawColor(0);

            // Draw Frets (Horizontal lines)
            for (let i = 0; i <= numFrets; i++) {
                const yOffset = originY + (i * fretSpacing);
                doc.line(originX, yOffset, originX + width, yOffset);
            }

            // Draw Strings (Vertical lines)
            for (let i = 0; i < numStrings; i++) {
                const xOffset = originX + (i * stringSpacing);
                doc.line(xOffset, originY, xOffset, originY + height);
            }

            // Draw Nut (thick top line if playing at different base fret, or double line)
            // If baseFret > 1, show fret number. Else thick line.
            if (shape.baseFret && shape.baseFret > 1) {
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.text(`${shape.baseFret}fr`, originX - 2, originY + fretSpacing / 1.5, { align: 'right' });
            } else {
                doc.setLineWidth(1.5);
                doc.line(originX, originY, originX + width, originY);
                doc.setLineWidth(0.2); // Reset
            }

            // Draw Dots (Fingers)
            const dotRadius = 1.8 * scale;

            // Handle Barres
            if (shape.barres) {
                shape.barres.forEach((baseString: number) => {
                    // Usually barres span multiple strings. 
                    // The data format from react-chords is slightly complex for barres, let's simplify.
                    // The 'frets' array usually tells the story. 
                    // If we have a barre, we draw a bar across.
                    // For simplicity in this PDF drawer, we will just iterate 'frets' and draw dots.
                    // Real barre rendering is nice but individual dots are legible too.
                });
            }

            // Frets array: [string6, string5, ..., string1] usually (E A D G B e)
            // But check mapping. existing component uses standard mapping.
            // Shape.frets: [-1 (mute), 0 (open), 1, 2, ...]
            // Strings are usually 6 to 1 reversed in array? 
            // In CHORD_SHAPES: C: [-1, 3, 2, 0, 1, 0] -> Low E to High E.

            shape.frets.forEach((fret: number, stringIndex: number) => {
                const xPos = originX + (stringIndex * stringSpacing); // String index 0 is Low E (Left)

                if (fret === -1) {
                    // Mute (X)
                    doc.setFontSize(7);
                    doc.text("X", xPos, originY - 1, { align: 'center' });
                } else if (fret === 0) {
                    // Open (O)
                    doc.setFontSize(7);
                    doc.text("O", xPos, originY - 1, { align: 'center' });
                } else {
                    // Finger position
                    // Calculate relative fret position based on baseFret
                    // If baseFret is 1 (default), fret 1 is at index 0.
                    // If shape has relative frets (1, 2, 3), simple mapping.
                    // IMPORTANT: The existing data structure seems to use relative fret numbers if they are clearly defined, but let's check.
                    // Example C: [-1, 3, 2, 0, 1, 0] -> absolute frets. 
                    // Example F (barre 1): [1, 3, 3, 2, 1, 1], baseFret: 1.
                    // The drawing usually draws relative to top of box.

                    let drawFret = fret;
                    if (shape.baseFret && shape.baseFret > 1) {
                        drawFret = fret - (shape.baseFret - 1);
                    }

                    if (drawFret > 0 && drawFret <= numFrets) {
                        const yPos = originY + (drawFret * fretSpacing) - (fretSpacing / 2);
                        doc.setFillColor(0, 0, 0);
                        doc.circle(xPos, yPos, dotRadius, 'F');
                    }
                }
            });
        };


        // Attempt to load a UTF-8 compatible font (Roboto) from CDN
        try {
            // Use a stable CDN for Roboto TTF that is known to work with PDF generators
            const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
            const response = await fetch(fontUrl);
            if (!response.ok) throw new Error("Failed to fetch font");
            const blob = await response.blob();
            const reader = new FileReader();

            await new Promise((resolve) => {
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    // Remove data:application/octet-stream;base64, prefix if present
                    const base64Font = base64data.split(',')[1];
                    if (base64Font) {
                        doc.addFileToVFS('Roboto-Regular.ttf', base64Font);
                        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
                        doc.setFont('Roboto');
                    }
                    resolve(true);
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn("Could not load custom font, falling back to standard.", e);
            doc.setFont("helvetica", "bold");
        }

        // --- Layout ---
        const pageWidth = 210; // A4 width mm
        const margin = 20;

        // Title
        doc.setFontSize(18);
        const splitTitle = doc.splitTextToSize(jamTitle, 170);
        doc.text(splitTitle, pageWidth / 2, 20, { align: 'center' }); // Centered

        let yPos = 20 + (splitTitle.length * 10) + 10;

        // Sort nodes by x-position
        const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x);

        sortedNodes.forEach((node) => {
            if (node.type !== 'songPart') return;

            // Page Break Check
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            // --- Part Name ---
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold"); // Or Roboto bold if loaded
            doc.text(node.data.label as string, margin, yPos);
            yPos += 8;

            // --- Annotation ---
            if (node.data.note) {
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");

                const notePrefix = "Annotation: ";
                const noteText = node.data.note as string;
                const fullText = notePrefix + noteText;

                // We want "Annotation:" bold perhaps? jsPDF handle mixed styles is hard.
                // Simpler: Just write "Annotation: <text>"
                const splitNote = doc.splitTextToSize(fullText, pageWidth - (margin * 2));
                doc.text(splitNote, margin, yPos);
                yPos += (splitNote.length * 5) + 5;
            } else {
                yPos += 2; // small gap if no note
            }

            // --- Chords ---
            const sectionId = node.data.extractedSectionId;
            const section = extractedSections.find(s => s.id === Number(sectionId));

            if (section) {
                const sectionChords = chordsTimeline
                    .filter(c => c.end > section.start_time && c.start < section.end_time)
                    .filter(c => (c.end - c.start) > 2)
                    .map(c => c.chord);

                // Merge manually added chords
                if (section.added_chords) {
                    sectionChords.push(...section.added_chords);
                }

                // Adjustments
                const adjustments = section.chord_adjustments || {};
                const finalChords = sectionChords
                    .filter(c => {
                        const adj = adjustments[c];
                        return !(adj && adj.action === 'hide');
                    })
                    .map(c => {
                        const adj = adjustments[c];
                        return (adj && adj.action === 'rename' && adj.to) ? adj.to : c;
                    });

                const uniqueChords = Array.from(new Set(finalChords));

                if (uniqueChords.length > 0) {
                    if (!showChordDiagrams && !showChordNames) {
                        // Do nothing
                    } else if (!showChordDiagrams && showChordNames) {
                        // Text List Only (Fallback)
                        doc.setFontSize(12);
                        doc.setFont("courier", "bold"); // Monospace for chords looks nice

                        const chordsStr = uniqueChords.join("  -  ");
                        const splitChords = doc.splitTextToSize(chordsStr, 170);

                        // Page break check
                        if (yPos > 270) {
                            doc.addPage();
                            yPos = 20;
                        }

                        doc.text("Chords:", margin, yPos);
                        yPos += 7;

                        doc.text(splitChords, margin, yPos);
                        yPos += (splitChords.length * 7);

                    } else {
                        // Diagrams (with or without names based on check inside drawChordDiagram)
                        doc.setFontSize(10);
                        doc.setFont("helvetica", "normal");
                        doc.text("Chords:", margin, yPos);

                        let chordStartY = yPos + 5;
                        let currentX = margin + 15;

                        uniqueChords.forEach(chordName => {
                            // Check space
                            if (currentX > (pageWidth - margin - 30)) {
                                // Wrap to new line
                                currentX = margin + 15;
                                chordStartY += 40; // Height of row
                            }

                            // Draw Diagram
                            const shape = getChordShape(chordName);
                            // If showChordDiagrams is true, we draw diagrams.
                            // Name visibility is handled inside drawChordDiagram based on prop? 
                            // Wait, drawChordDiagram uses local logic. We modified it above to check showChordNames.
                            // But drawChordDiagram is defined inside handleDownloadPDF scope, so it can access showChordNames?
                            // No, drawChordDiagram is defined inside, but showChordNames is passed to handleDownloadPDF.
                            // Yes, it's a closure, so it can access it.
                            if (showChordDiagrams) {
                                drawChordDiagram(doc, currentX, chordStartY, chordName, shape);
                            }
                            currentX += 25; // Spacing between chord diagrams
                        });

                        yPos = chordStartY + 50; // Height of last row
                    }
                }
            }
            yPos += 15; // Spacing between parts
        });

        // Sanitize filename
        const safeFilename = jamTitle.replace(/[\/\\:*?"<>|]/g, '_');
        doc.save(`${safeFilename}.pdf`);
    }, [nodes, jamTitle, extractedSections, chordsTimeline]);

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

    const startEditingNode = useCallback((id: string, label: string) => {
        setEditingNodeId(id);
        setNodeLabel(label);
        // Find existing note
        const node = nodes.find(n => n.id === id);
        setNoteContent((node?.data?.note as string) || "");

        // Open modal
        setIsNoteModalOpen(true);
    }, [nodes]);

    const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
        startEditingNode(node.id, node.data.label as string);
    }, [startEditingNode]);

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
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0 mr-4">
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
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => setIsDownloadModalOpen(true)}
                        disabled={nodes.length === 0}
                        className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download PDF"
                    >
                        <Download size={14} />
                        Download PDF
                    </button>
                    <button
                        onClick={() => setIsClearModalOpen(true)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
                    >
                        <Trash2 size={14} />
                        Clear Flow
                    </button>
                </div>
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

            <DownloadOptionsModal
                isOpen={isDownloadModalOpen}
                onClose={() => setIsDownloadModalOpen(false)}
                onDownload={(options) => {
                    handleDownloadPDF(options);
                    setIsDownloadModalOpen(false);
                }}
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

                        <div className="flex flex-col gap-2 mt-4"> {/* Added mt-4 for spacing */}
                            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Associated Audio</label>
                            <select
                                value={(nodes.find(n => n.id === editingNodeId)?.data?.extractedSectionId as string) || ""}
                                onChange={(e) => {
                                    const sectionId = e.target.value ? parseInt(e.target.value) : null;
                                    setNodes((nds) =>
                                        nds.map((node) => {
                                            if (node.id === editingNodeId) {
                                                const section = extractedSections.find(s => s.id === sectionId);
                                                return {
                                                    ...node,
                                                    data: {
                                                        ...node.data,
                                                        extractedSectionId: sectionId,
                                                        // Optional: Auto-update label if generic or empty? 
                                                        // Maybe better to verify with user, but let's stick to just linking for now.
                                                        // actually updating label is nice UX.
                                                        // actually updating label is nice UX.
                                                        label: section ? section.title : node.data.label,
                                                        syncedSectionTitle: section ? section.title : undefined
                                                    },
                                                };
                                            }
                                            return node;
                                        })
                                    );
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-white text-sm focus:outline-none focus:border-purple-500"
                            >
                                <option value="">None</option>
                                {extractedSections.map(section => {


                                    return (
                                        <option key={section.id} value={section.id}>
                                            {section.title} ({Math.floor(section.start_time / 60)}:{(section.start_time % 60).toFixed(0).padStart(2, '0')} - {Math.floor(section.end_time / 60)}:{(section.end_time % 60).toFixed(0).padStart(2, '0')})
                                        </option>
                                    );
                                })}
                            </select>
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
