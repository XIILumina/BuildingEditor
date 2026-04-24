import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function UpdatePasswordForm({ className = '' }) {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    const PasswordField = ({ label, id, value, onChange, show, onToggle, error, autoComplete }) => (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-gray-200 mb-3">
                {label}
            </label>
            <div className="relative">
                <TextInput
                    id={id}
                    ref={id === 'current_password' ? currentPasswordInput : id === 'password' ? passwordInput : null}
                    value={value}
                    onChange={onChange}
                    type={show ? 'text' : 'password'}
                    className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent text-white placeholder-gray-500 transition-all duration-200"
                    placeholder={label}
                    autoComplete={autoComplete}
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            <InputError message={error} className="mt-2 text-red-400" />
        </div>
    );

    return (
        <section className={className}>
            <form onSubmit={updatePassword} className="space-y-6">
                <PasswordField
                    label="Current Password"
                    id="current_password"
                    value={data.current_password}
                    onChange={(e) => setData('current_password', e.target.value)}
                    show={showCurrent}
                    onToggle={() => setShowCurrent(!showCurrent)}
                    error={errors.current_password}
                    autoComplete="current-password"
                />

                <PasswordField
                    label="New Password"
                    id="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    show={showNew}
                    onToggle={() => setShowNew(!showNew)}
                    error={errors.password}
                    autoComplete="new-password"
                />

                <PasswordField
                    label="Confirm Password"
                    id="password_confirmation"
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    show={showConfirm}
                    onToggle={() => setShowConfirm(!showConfirm)}
                    error={errors.password_confirmation}
                    autoComplete="new-password"
                />

                {/* Success Message */}
                <Transition
                    show={recentlySuccessful}
                    enter="transition ease-in-out duration-300"
                    enterFrom="opacity-0 transform scale-95"
                    leave="transition ease-in-out duration-300"
                    leaveTo="opacity-0 transform scale-95"
                >
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center space-x-3"
                    >
                        <CheckCircle size={20} className="text-green-400" />
                        <p className="text-sm font-medium text-green-100">
                            Password updated successfully!
                        </p>
                    </motion.div>
                </Transition>

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <PrimaryButton
                        disabled={processing}
                        className="px-6 py-2.5 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-fuchsia-700 text-white font-semibold rounded-lg shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                    >
                        {processing ? 'Updating...' : 'Update Password'}
                    </PrimaryButton>
                </div>
            </form>
        </section>
    );
}
