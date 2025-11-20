import React from "react";

interface EmptyStateProps {
  Icon: React.ComponentType<any>;
  message: string;
}

export const EmptyState = ({ Icon, message }: EmptyStateProps) => (
  <div className="text-center py-8">
    <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
      <Icon className="h-6 w-6 text-gray-400" />
    </div>
    <p className="text-gray-600 text-sm">{message}</p>
  </div>
);
