import { getUsers, isAdmin } from "@/app/actions";
import { UsersTable } from "./users-table";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
    const admin = await isAdmin();

    if (!admin) {
        redirect('/');
    }

    const user = await currentUser();
    const currentUserEmail = user?.emailAddresses[0]?.emailAddress;

    const users = await getUsers();

    return (
        <div className="min-h-screen pt-24 pb-12 px-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">User Management</h1>
                </div>
            </div>

            <UsersTable users={users} currentUserEmail={currentUserEmail} />
        </div>
    );
}
