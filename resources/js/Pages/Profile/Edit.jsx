import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { motion } from 'framer-motion';
import { User, Lock, Trash2 } from 'lucide-react';

export default function Edit({ mustVerifyEmail, status }) {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.1,
            },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    };

    return (
        <AuthenticatedLayout header="Profile Settings">
            <Head title="Profile" />

            <motion.div
                className="py-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Profile Header */}
                <motion.div
                    variants={cardVariants}
                    className="mb-8"
                >
                    <div className="max-w-2xl mx-auto px-4">
                        <div className="flex items-center space-x-4">
                            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                <User size={40} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">Account Settings</h3>
                                <p className="text-gray-400 text-sm mt-1">Manage your profile and preferences</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="mx-auto max-w-2xl space-y-6 px-4">
                    {/* Profile Information */}
                    <motion.div variants={cardVariants}>
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-950 to-black border border-cyan-500/20 shadow-lg hover:border-cyan-500/40 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-fuchsia-500/5 pointer-events-none" />
                            <div className="relative p-8">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                                        <User size={24} className="text-white" />
                                    </div>
                                    <h4 className="text-xl font-bold text-white">Profile Information</h4>
                                </div>
                                <UpdateProfileInformationForm
                                    mustVerifyEmail={mustVerifyEmail}
                                    status={status}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Password */}
                    <motion.div variants={cardVariants}>
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-950 to-black border border-fuchsia-500/20 shadow-lg hover:border-fuchsia-500/40 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-purple-500/5 pointer-events-none" />
                            <div className="relative p-8">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-fuchsia-400 to-fuchsia-600 flex items-center justify-center">
                                        <Lock size={24} className="text-white" />
                                    </div>
                                    <h4 className="text-xl font-bold text-white">Change Password</h4>
                                </div>
                                <UpdatePasswordForm />
                            </div>
                        </div>
                    </motion.div>

                    {/* Danger Zone */}
                    <motion.div variants={cardVariants}>
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-950/50 via-gray-950 to-black border border-red-500/20 shadow-lg hover:border-red-500/40 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 pointer-events-none" />
                            <div className="relative p-8">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                                        <Trash2 size={24} className="text-white" />
                                    </div>
                                    <h4 className="text-xl font-bold text-white">Danger Zone</h4>
                                </div>
                                <DeleteUserForm />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AuthenticatedLayout>
    );
}
