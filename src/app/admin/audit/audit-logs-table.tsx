"use client";

import { useState, Fragment } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AuditLog } from '@/lib/audit';

export function AuditLogsTable({ logs }: { logs: AuditLog[] }) {
    // const router = useRouter(); 
    // const searchParams = useSearchParams();
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    const toggleRow = (id: number) => {
        const next = new Set(expandedRows);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setExpandedRows(next);
    };

    return (
        <div className="space-y-4">
            {/* Table */}
            <div className="border border-white/10 rounded-lg overflow-hidden bg-[#1a1a1a]">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-white/60">
                            <th className="p-4 w-8"></th>
                            <th className="p-4 font-medium">Timestamp</th>
                            <th className="p-4 font-medium">User</th>
                            <th className="p-4 font-medium">Action</th>
                            <th className="p-4 font-medium">Resource</th>
                            <th className="p-4 font-medium">Details Summary</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-white/40">
                                    No logs found.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <Fragment key={log.id}>
                                    <tr
                                        onClick={() => toggleRow(log.id)}
                                        className="hover:bg-white/5 cursor-pointer transition-colors"
                                    >
                                        <td className="p-4 text-white/40">
                                            {expandedRows.has(log.id) ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </td>
                                        <td className="p-4 text-white/80 whitespace-nowrap">
                                            {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                                        </td>
                                        <td className="p-4 text-white">
                                            <div className="font-medium">
                                                {log.first_name} {log.last_name}
                                            </div>
                                            <div className="text-xs text-white/50">{log.email || log.user_id}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-block px-2 py-1 rounded bg-white/10 text-xs font-mono text-purple-300 border border-white/5">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4 text-white/70">
                                            <div className="text-xs uppercase tracking-wider text-white/40 mb-0.5">
                                                {log.resource_type}
                                            </div>
                                            <div className="font-mono text-xs truncate max-w-[120px]">
                                                {log.resource_id || '-'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-white/50 truncate max-w-[200px]">
                                            {JSON.stringify(log.details)}
                                        </td>
                                    </tr>
                                    {expandedRows.has(log.id) && (
                                        <tr className="bg-black/20">
                                            <td colSpan={6} className="p-4">
                                                <div className="bg-black/40 rounded-md p-4 border border-white/10 font-mono text-xs text-green-400 overflow-x-auto">
                                                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="text-xs text-white/30 text-center">
                Showing most recent {logs.length} logs
            </div>
        </div>
    );
}
