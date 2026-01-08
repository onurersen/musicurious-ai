"use client";

import { User, updateUserStatus, deleteUser, banUser, forceLogoutUser } from "@/app/actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Ban, Trash2, ShieldAlert, X, Unlock, Lock, LogOut } from "lucide-react";
import { createPortal } from "react-dom";

export function UserRow({ user, currentUserEmail }: { user: User, currentUserEmail?: string }) {
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showBanConfirm, setShowBanConfirm] = useState(false);
    const router = useRouter();

    const isSelf = user.email === currentUserEmail;

    const handleStatusUpdate = async (status: 'approved' | 'blocked' | 'pending') => {
        setLoading(true);
        try {
            await updateUserStatus(user.id, status);
            router.refresh();
        } finally {
            setLoading(false);
        }
    };

    const handleForceLogout = async () => {
        setLoading(true);
        try {
            const res = await forceLogoutUser(user.id);
            if (res.success) {
                // Optionally could show a success state, but for now just quiet is fine or router refresh
                console.log("Logged out user");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteUser(user.id);
            router.refresh();
            setShowDeleteConfirm(false);
        } finally {
            setLoading(false);
        }
    };

    const handleBan = async () => {
        setLoading(true);
        try {
            await banUser(user.id, user.email);
            router.refresh();
            setShowBanConfirm(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <tr className="group hover:bg-white/5 transition-colors">
            <td className="p-4 text-muted-foreground whitespace-nowrap">
                <div className="flex flex-col gap-0.5">
                    <span suppressHydrationWarning className="text-white font-medium text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
                    <span suppressHydrationWarning className="text-xs text-muted-foreground/70">{new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </td>
            <td className="p-4">
                <div className="flex flex-col">
                    <span className={`font-medium ${!user.first_name && !user.last_name ? 'text-muted-foreground italic' : 'text-white'}`}>
                        {(user.first_name || user.last_name) ? `${user.first_name} ${user.last_name}`.trim() : 'No Name Provided'}
                    </span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
            </td>
            <td className="p-4 whitespace-nowrap">
                {user.last_login ? (
                    <div className="flex flex-col gap-0.5">
                        <span suppressHydrationWarning className="text-white font-medium text-sm">{new Date(user.last_login).toLocaleDateString()}</span>
                        <span suppressHydrationWarning className="text-xs text-muted-foreground/70">{new Date(user.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground italic">Never</span>
                )}
            </td>
            <td className="p-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                    ${user.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        user.status === 'blocked' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'}`}>
                    {user.status}
                </span>
            </td>
            <td className="p-4">
                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    {/* Actions */}
                    {isSelf ? (
                        <span className="text-xs text-muted-foreground italic">Current Admin</span>
                    ) : (
                        <>
                            {user.status === 'pending' && (
                                <button
                                    onClick={() => handleStatusUpdate('approved')}
                                    disabled={loading}
                                    title="Approve"
                                    className="p-2 rounded-lg bg-green-600/20 hover:bg-green-600 hover:text-white border border-green-600/30 text-green-400 transition-all"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                            )}

                            {user.status !== 'blocked' ? (
                                <button
                                    onClick={() => handleStatusUpdate('blocked')}
                                    disabled={loading}
                                    title="Block User"
                                    className="p-2 rounded-lg bg-orange-500/20 hover:bg-orange-500 hover:text-white border border-orange-500/30 text-orange-400 transition-all"
                                >
                                    <Lock className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleStatusUpdate('approved')}
                                    disabled={loading}
                                    title="Unblock User"
                                    className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500 hover:text-white border border-blue-500/30 text-blue-400 transition-all"
                                >
                                    <Unlock className="w-4 h-4" />
                                </button>
                            )}

                            <button
                                onClick={handleForceLogout}
                                disabled={loading}
                                title="Force User Logout"
                                className="p-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500 hover:text-white border border-indigo-500/30 text-indigo-400 transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={loading}
                                title="Remove User"
                                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => setShowBanConfirm(true)}
                                disabled={loading}
                                title="Ban & Remove User"
                                className="p-2 rounded-lg bg-zinc-700/50 hover:bg-red-900 hover:text-white border border-red-900/30 text-zinc-400 hover:border-red-500 transition-all"
                            >
                                <Ban className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>

                {/* Confirm Modals via Portal */}
                {typeof document !== 'undefined' && createPortal(
                    <>
                        {showDeleteConfirm && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200 text-left">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                    <h3 className="text-xl font-bold text-white mb-2">Remove User?</h3>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        This will delete the user and all their data (videos, stems, etc.). They can register again later.
                                    </p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white">Cancel</button>
                                        <button onClick={handleDelete} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-500/20">Delete</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {showBanConfirm && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200 text-left">
                                    <button
                                        onClick={() => setShowBanConfirm(false)}
                                        className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><ShieldAlert className="text-red-500" /> Ban User?</h3>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        This will <strong>permanently ban</strong> this email address from registering again and delete all existing data.
                                    </p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowBanConfirm(false)} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white">Cancel</button>
                                        <button onClick={handleBan} className="flex-1 py-2 rounded-xl bg-red-900 hover:bg-red-800 text-white font-bold shadow-lg shadow-red-900/20">Ban Forever</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>,
                    document.body
                )}
            </td>
        </tr>
    );
}
