import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';

export default function DeleteUserForm({ className = '' }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
        setShowPassword(false);
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={confirmUserDeletion}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-200 flex items-center justify-center space-x-2"
            >
                <AlertTriangle size={20} />
                <span>Delete Account</span>
            </motion.button>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-8 bg-gradient-to-b from-gray-900 to-black rounded-lg"
                >
                    {/* Header with Warning Icon */}
                    <div className="flex items-start space-x-4 mb-6">
                        <div className="h-12 w-12 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle size={28} className="text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                Delete Account?
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">
                                This action cannot be undone
                            </p>
                        </div>
                    </div>

                    {/* Warning Message */}
                    <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                        <p className="text-red-100 text-sm leading-relaxed">
                            <strong>⚠️ Warning:</strong> Once your account is deleted, all projects, layers, drawings, and associated data will be permanently erased. This cannot be recovered. Please ensure you have exported or backed up any important work before proceeding.
                        </p>
                    </div>

                    {/* Password Confirmation */}
                    <form onSubmit={deleteUser} className="space-y-6">
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-200 mb-3">
                                Enter your password to confirm
                            </label>
                            <div className="relative">
                                <TextInput
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-500 transition-all duration-200"
                                    placeholder="Enter password"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <InputError message={errors.password} className="mt-2 text-red-400" />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-700">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-lg transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-red-500/25 transition-all duration-200"
                            >
                                {processing ? 'Deleting...' : 'Delete Account Permanently'}
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            </Modal>
        </section>
    );
}
