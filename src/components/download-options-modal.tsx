"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X, Download, FileText, Image as ImageIcon } from "lucide-react";

interface DownloadOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownload: (options: { showChordNames: boolean; showChordDiagrams: boolean }) => void;
}

export function DownloadOptionsModal({
    isOpen,
    onClose,
    onDownload
}: DownloadOptionsModalProps) {
    const [mounted, setMounted] = useState(false);
    const [chordOption, setChordOption] = useState<'namesOnly' | 'namesAndDiagrams'>('namesAndDiagrams');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const handleConfirm = () => {
        onDownload({
            showChordNames: true, // Always show names in current requested options
            showChordDiagrams: chordOption === 'namesAndDiagrams'
        });
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Download className="w-5 h-5 text-purple-400" />
                        Download PDF Options
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-white/50 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-white/80 text-sm mb-4">
                        Choose how chords should appear in the PDF:
                    </p>

                    {/* Radio: Chord Names Only */}
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-white/5">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${chordOption === 'namesOnly' ? 'border-purple-500' : 'border-white/30'}`}>
                            {chordOption === 'namesOnly' && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                        </div>
                        <input
                            type="radio"
                            name="chordOption"
                            className="hidden"
                            checked={chordOption === 'namesOnly'}
                            onChange={() => setChordOption('namesOnly')}
                        />
                        <div className="flex items-center gap-3 text-white">
                            <FileText className="w-4 h-4 text-white/60" />
                            <span className="font-medium">Chord Names Only</span>
                        </div>
                    </label>

                    {/* Radio: Names + Diagrams */}
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-white/5">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${chordOption === 'namesAndDiagrams' ? 'border-purple-500' : 'border-white/30'}`}>
                            {chordOption === 'namesAndDiagrams' && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                        </div>
                        <input
                            type="radio"
                            name="chordOption"
                            className="hidden"
                            checked={chordOption === 'namesAndDiagrams'}
                            onChange={() => setChordOption('namesAndDiagrams')}
                        />
                        <div className="flex items-center gap-3 text-white">
                            <ImageIcon className="w-4 h-4 text-white/60" />
                            <span className="font-medium">Chord Names + Representations</span>
                        </div>
                    </label>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 bg-white/5 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                    >
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
