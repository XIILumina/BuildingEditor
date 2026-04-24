import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Mail, User } from 'lucide-react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <form onSubmit={submit} className="space-y-6">
                {/* Name Field */}
                <div>
                    <label htmlFor="name" className="flex items-center space-x-2 mb-3">
                        <User size={18} className="text-cyan-400" />
                        <span className="text-sm font-semibold text-gray-200">Full Name</span>
                    </label>
                    <TextInput
                        id="name"
                        type="text"
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-500 transition-all duration-200"
                        placeholder="Your full name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />
                    <InputError className="mt-2 text-red-400" message={errors.name} />
                </div>

                {/* Email Field */}
                <div>
                    <label htmlFor="email" className="flex items-center space-x-2 mb-3">
                        <Mail size={18} className="text-cyan-400" />
                        <span className="text-sm font-semibold text-gray-200">Email Address</span>
                    </label>
                    <TextInput
                        id="email"
                        type="email"
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-500 transition-all duration-200"
                        placeholder="your@email.com"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />
                    <InputError className="mt-2 text-red-400" message={errors.email} />
                </div>

                {/* Email Verification Notice */}
                {mustVerifyEmail && user.email_verified_at === null && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3"
                    >
                        <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-amber-100">
                                Your email address is unverified.{' '}
                                <Link
                                    href={route('verification.send')}
                                    method="post"
                                    as="button"
                                    className="font-semibold underline hover:text-amber-50 transition-colors"
                                >
                                    Click here to re-send verification email.
                                </Link>
                            </p>
                            {status === 'verification-link-sent' && (
                                <p className="text-sm text-green-400 mt-2 font-medium">
                                    ✓ Verification link sent to your email!
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}

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
                            Profile updated successfully!
                        </p>
                    </motion.div>
                </Transition>

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <PrimaryButton
                        disabled={processing}
                        className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                    >
                        {processing ? 'Saving...' : 'Save Changes'}
                    </PrimaryButton>
                </div>
            </form>
        </section>
    );
}
