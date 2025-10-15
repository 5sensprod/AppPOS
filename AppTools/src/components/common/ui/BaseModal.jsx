// AppTools/src/components/ui/BaseModal.jsx
import { X } from 'lucide-react';

const BaseModal = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  footer,
  maxWidth = 'max-w-2xl',
  className = '',
  fullScreen = false, // ⬅️ nouvelle prop
}) => {
  if (!isOpen) return null;

  // Overlay padding: pas de padding en plein écran
  const overlayPadding = fullScreen ? 'p-0' : 'p-2 sm:p-4';

  // Conteneur principal : taille/arrondis selon le mode
  const containerClasses = [
    'bg-white dark:bg-gray-800 shadow-xl flex flex-col',
    fullScreen
      ? 'w-screen h-screen rounded-none'
      : `${maxWidth} w-full h-full max-h-[95vh] sm:max-h-[90vh] rounded-lg`,
    className,
  ].join(' ');

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center ${overlayPadding}`}
      style={{ zIndex: 99999 }}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
    >
      <div className={containerClasses}>
        {/* En-tête fixe */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />}
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Fermer la modale"
          >
            <X className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" />
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">{children}</div>
        </div>

        {/* Pied de page fixe */}
        {footer && (
          <div className="flex justify-end space-x-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-750">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
