import React from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, LogIn, X } from 'lucide-react'

interface LoginPromptModalProps {
    isOpen: boolean
    onClose: () => void
    onLoginClick: () => void
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
    isOpen,
    onClose,
    onLoginClick
}) => {
    const { t } = useTranslation()

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm mx-4 bg-white dark:bg-dark-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-gray-200 dark:border-dark-700">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 dark:bg-dark-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors flex items-center justify-center"
                        aria-label={t('common.close')}
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                        <UserPlus className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                    </div>

                    <h2 className="text-lg font-bold text-center text-gray-900 dark:text-gray-100">
                        {t('guest.featureRequiresLogin')}
                    </h2>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
                        {t('guest.loginPrompt')}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={onLoginClick}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                            <LogIn className="w-4 h-4" />
                            {t('guest.login')}
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-200 dark:border-dark-700 hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginPromptModal
