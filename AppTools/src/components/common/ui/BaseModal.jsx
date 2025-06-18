// AppTools\src\components\ui\BaseModal.jsx
import { X } from 'lucide-react';

const BaseModal = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  footer,
  maxWidth = 'max-w-2xl', // Configurable
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-16">
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${maxWidth} w-full max-h-[calc(100vh-8rem)] flex flex-col ${className}`}
      >
        {/* En-tête fixe */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            {Icon && <Icon className="h-5 w-5 mr-2 text-blue-500" />}
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" />
          </button>
        </div>

        {/* Corps avec scroll */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">{children}</div>
        </div>

        {/* Pied de page fixe */}
        {footer && (
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-750">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
