
import { sql } from '@vercel/postgres';
import { currentUser } from "@clerk/nextjs/server";

export async function logAuditAction({
    userId,
    action,
    resourceType,
    resourceId,
    details = {}
}: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, unknown>;
}) {
    // If not running on server (shouldn't happen if called from action but good to catch)
    if (typeof window !== 'undefined') {
        console.error("logAuditAction called from client side!");
        return;
    }

    try {
        await sql`
            INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
            VALUES (${userId}, ${action}, ${resourceType}, ${resourceId || null}, ${JSON.stringify(details)})
        `;
    } catch (err) {
        console.error("Failed to log audit action:", err);
        // We do typically NOT throw here to avoid blocking the main user action if logging fails
    }
}

export type AuditLogFilter = {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
};

export interface AuditLog {
    id: number;
    user_id: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    details: unknown;
    created_at: string;
    first_name?: string;
    last_name?: string;
    email?: string;
}

export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const offset = (page - 1) * limit;

    try {
        // ... (query remains same)
        const result = await sql`
            SELECT 
                al.*,
                u.first_name,
                u.last_name,
                u.email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 
                (${filter.userId ? filter.userId : null}::text IS NULL OR al.user_id = ${filter.userId})
                AND
                (${filter.action ? filter.action : null}::text IS NULL OR al.action = ${filter.action})
            ORDER BY al.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        return result.rows.map(row => ({
            id: row.id,
            user_id: row.user_id,
            action: row.action,
            resource_type: row.resource_type,
            resource_id: row.resource_id,
            details: row.details,
            created_at: new Date(row.created_at).toISOString(),
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email
        })) as AuditLog[];

    } catch (err) {
        console.error("Error fetching audit logs:", err);
        return [];
    }
}


