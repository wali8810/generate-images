import React from 'react';

interface StatusBannerProps {
    subscriptionStatus?: string;
    isAdmin: boolean;
}

const STATUS_CONFIG = {
    active: {
        message: "Plano ativo. Aproveite suas estampas!",
        bgColor: "bg-green-50",
        textColor: "text-green-800",
        borderColor: "border-green-200",
        icon: "✓"
    },
    pending: {
        message: "Pagamento pendente. Regularize seu plano para gerar novas artes.",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-800",
        borderColor: "border-yellow-200",
        icon: "⚠"
    },
    overdue: {
        message: "Seu pagamento está atrasado. Faça o pagamento para liberar o gerador de artes.",
        bgColor: "bg-orange-50",
        textColor: "text-orange-800",
        borderColor: "border-orange-200",
        icon: "⚠"
    },
    cancelled: {
        message: "Seu plano foi cancelado. Entre em contato para reativar.",
        bgColor: "bg-red-50",
        textColor: "text-red-800",
        borderColor: "border-red-200",
        icon: "✕"
    },
    inactive: {
        message: "Sua conta está inativa. Contate o administrador para liberar o acesso.",
        bgColor: "bg-red-50",
        textColor: "text-red-800",
        borderColor: "border-red-200",
        icon: "✕"
    }
};

export const StatusBanner: React.FC<StatusBannerProps> = ({ subscriptionStatus, isAdmin }) => {
    // Don't show banner for admins or if no status
    if (isAdmin || !subscriptionStatus) {
        return null;
    }

    const config = STATUS_CONFIG[subscriptionStatus as keyof typeof STATUS_CONFIG];

    // If status not recognized, don't show banner
    if (!config) {
        return null;
    }

    return (
        <div className={`${config.bgColor} ${config.textColor} ${config.borderColor} border-l-4 p-4 mb-6 rounded-r-lg shadow-sm`}>
            <div className="flex items-center">
                <span className="text-2xl mr-3">{config.icon}</span>
                <p className="font-medium">{config.message}</p>
            </div>
        </div>
    );
};
