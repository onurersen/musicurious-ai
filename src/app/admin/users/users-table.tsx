"use client";

import { useState } from 'react';
import { Search } from 'lucide-react';
import { UserRow } from './user-row';
import { User } from '@/app/actions';

interface UsersTableProps {
    users: User[];
    currentUserEmail?: string;
}

export function UsersTable({ users, currentUserEmail }: UsersTableProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredUsers = users.filter(user => {
        if (searchQuery.length < 2) return true;

        const query = searchQuery.toLowerCase();
        const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
        const email = user.email.toLowerCase();

        return fullName.includes(query) || email.includes(query);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative group w-full sm:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl leading-5 bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-all duration-300"
                    />
                </div>
                <div className="text-sm text-muted-foreground bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    Showing {filteredUsers.length} of {users.length} Users
                </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            <tr>
                                <th className="p-4 w-32">Joined</th>
                                <th className="p-4">User</th>
                                <th className="p-4 w-32">Last Login</th>
                                <th className="p-4 w-32">Status</th>
                                <th className="p-4 w-48 text-right pr-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((u) => (
                                <UserRow key={u.id} user={u} currentUserEmail={currentUserEmail} />
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground">
                        {searchQuery ? `No users found matching "${searchQuery}"` : "No users found."}
                    </div>
                )}
            </div>
        </div>
    );
}
