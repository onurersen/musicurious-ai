"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, X, User as UserIcon, Check } from 'lucide-react';
import { searchUsers } from '@/app/actions';

// Constants for Action Types
const ACTION_TYPES = [
    'SUBMIT_JAM',
    'APPROVE_JAM',
    'REJECT_JAM',
    'ADD_TO_LIBRARY',
    'SEARCH_JAMS',
    'DELETE_JAM',
    'REMOVE_STEMS',
    'BAN_USER',
    'DELETE_USER',
    'FORCE_LOGOUT',
    'UPDATE_USER_STATUS',
    'UPDATE_SESSION_SETTINGS',
    'EXTRACT_SECTION',
    'RENAME_SECTION',
    'DELETE_SECTION',
    'ADD_CHORD',
    'REMOVE_CHORD',
    'UPDATE_CHORD',
    'RESET_CHORDS',
    'UPDATE_FLOW_CANVAS',
    'DOWNLOAD_FLOW_PDF'
].sort();

interface UserOption {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
}

export function AuditFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // --- State ---
    const initialUserId = searchParams ? searchParams.get('userId') || '' : '';
    const initialAction = searchParams ? searchParams.get('action') || '' : '';

    const [selectedUserId, setSelectedUserId] = useState(initialUserId);
    const [selectedAction, setSelectedAction] = useState(initialAction);

    // Autocomplete State
    const [userQuery, setUserQuery] = useState("");
    const [userOptions, setUserOptions] = useState<UserOption[]>([]);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [selectedUserLabel, setSelectedUserLabel] = useState(""); // Display name for selected user

    const wrapperRef = useRef<HTMLDivElement>(null);

    // --- Effects ---

    // Initial label set if ID exists (we might not have name, so just show ID or generic)
    useEffect(() => {
        if (initialUserId && !selectedUserLabel) {
            setSelectedUserLabel(initialUserId); // Fallback until we can maybe fetch it? 
            // Ideally we'd fetch the user info to display name, or pass it from server.
            // For now, ID is acceptable fallback if came from URL directly.
        }
    }, [initialUserId]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Search Users Debounce
    useEffect(() => {
        if (!userQuery || userQuery.length < 2) {
            setUserOptions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoadingUsers(true);
            const users = await searchUsers(userQuery);
            setUserOptions(users);
            setIsLoadingUsers(false);
            setIsUserDropdownOpen(true);
        }, 300);

        return () => clearTimeout(timer);
    }, [userQuery]);


    // --- Handlers ---

    const applyFilters = (userId: string, action: string) => {
        const params = new URLSearchParams();
        if (userId) params.set('userId', userId);
        if (action) params.set('action', action);
        router.push(`?${params.toString()}`);
    };

    const handleUserSelect = (user: UserOption) => {
        setSelectedUserId(user.id);
        const label = `${user.first_name} ${user.last_name} (${user.email})`.trim();
        setSelectedUserLabel(label);
        setUserQuery(""); // Clear query
        setIsUserDropdownOpen(false);
        applyFilters(user.id, selectedAction);
    };

    const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const action = e.target.value;
        setSelectedAction(action);
        applyFilters(selectedUserId, action);
    };

    const clearUser = () => {
        setSelectedUserId("");
        setSelectedUserLabel("");
        setUserQuery("");
        applyFilters("", selectedAction);
    };

    const clearAll = () => {
        setSelectedUserId("");
        setSelectedUserLabel("");
        setSelectedAction("");
        setUserQuery("");
        router.push('?');
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 items-end bg-white/5 p-4 rounded-lg border border-white/10 mb-6">

            {/* User Autocomplete */}
            <div className="flex-1 w-full relative" ref={wrapperRef}>
                <label className="text-xs text-white/50 mb-1 block">Filter by User</label>

                {selectedUserId ? (
                    <div className="flex items-center justify-between bg-white/10 border border-white/20 rounded-md py-2 px-3 text-sm text-white">
                        <div className="flex items-center gap-2 truncate">
                            <UserIcon size={14} className="text-purple-400" />
                            <span className="truncate">{selectedUserLabel}</span>
                        </div>
                        <button onClick={clearUser} className="text-white/50 hover:text-white ml-2">
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <input
                            type="text"
                            value={userQuery}
                            onChange={(e) => {
                                setUserQuery(e.target.value);
                                setIsUserDropdownOpen(true);
                            }}
                            onFocus={() => userQuery.length >= 2 && setIsUserDropdownOpen(true)}
                            className="w-full bg-black/40 border border-white/10 rounded-md py-2 pl-8 pr-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="Search name or email..."
                        />
                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-white/30" />
                    </div>
                )}

                {/* Dropdown Results */}
                {isUserDropdownOpen && userOptions.length > 0 && !selectedUserId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-md shadow-xl z-50 max-h-60 overflow-y-auto">
                        {userOptions.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleUserSelect(user)}
                                className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-white border-b border-white/5 last:border-0 flex flex-col gap-0.5"
                            >
                                <span className="font-medium">{user.first_name} {user.last_name}</span>
                                <span className="text-xs text-white/50">{user.email}</span>
                            </button>
                        ))}
                    </div>
                )}

                {isUserDropdownOpen && userQuery.length >= 2 && userOptions.length === 0 && !isLoadingUsers && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-md shadow-xl z-50 p-3 text-xs text-white/50 text-center">
                        No users found
                    </div>
                )}
            </div>

            {/* Action Select */}
            <div className="flex-1 w-full">
                <label className="text-xs text-white/50 mb-1 block">Filter by Action</label>
                <div className="relative">
                    <select
                        value={selectedAction}
                        onChange={handleActionChange}
                        className="w-full bg-black/40 border border-white/10 rounded-md py-2 pl-8 pr-8 text-sm text-white focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
                    >
                        <option value="">All Actions</option>
                        {ACTION_TYPES.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                    <Filter className="absolute left-2.5 top-2.5 w-4 h-4 text-white/30 pointer-events-none" />
                    <div className="absolute right-3 top-3 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-white/30 pointer-events-none" />
                </div>
            </div>

            {/* Clear Button */}
            {(selectedUserId || selectedAction) && (
                <button
                    onClick={clearAll}
                    className="text-red-400 hover:text-red-300 text-sm font-medium px-4 py-2 mb-0.5 transition-colors flex items-center gap-2"
                >
                    <X size={14} />
                    Reset
                </button>
            )}
        </div>
    );
}
