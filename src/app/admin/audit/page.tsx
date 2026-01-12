import { isAdmin } from "@/app/actions";
import { getAuditLogs } from "@/lib/audit";
import { redirect } from "next/navigation";
import { AuditLogsTable } from "./audit-logs-table";
import { AuditFilters } from "./audit-filters";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuditPage({ searchParams }: PageProps) {
    const admin = await isAdmin();
    if (!admin) redirect('/');

    const resolvedParams = await searchParams;
    const userId = typeof resolvedParams?.userId === 'string' ? resolvedParams.userId : undefined;
    const action = typeof resolvedParams?.action === 'string' ? resolvedParams.action : undefined;

    const logs = await getAuditLogs({ userId, action, limit: 100 });

    return (
        <div className="container mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white">Audit Logs</h1>
            </div>

            <AuditFilters />

            <AuditLogsTable logs={logs} />
        </div>
    );
}
