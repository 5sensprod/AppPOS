// src/features/pos/CashierPage.jsx - Version complète avec fond de caisse
import React, { useEffect, useCallback, useState } from 'react';
import { useCashierStore } from './stores/cashierStore';
import { useSessionStore } from '../../stores/sessionStore';
import SessionHeader from './components/SessionHeader';
import ProductSearch from './components/ProductSearch';
import Cart from './components/Cart';
import PaymentModal from './components/PaymentModal';
import ReceiptModal from './components/ReceiptModal';
import ErrorDisplay from './components/ErrorDisplay';
import DrawerIndicator from './components/DrawerIndicator';
import DrawerMovementModal from './components/DrawerMovementModal';
import DrawerClosingModal from './components/DrawerClosingModal';
import DrawerReportModal from './components/DrawerReportModal';

const CashierPage = () => {
  // ✅ SÉLECTEURS STABLES
  const user = useSessionStore((state) => state.user);
  const stopSession = useSessionStore((state) => state.stopSession); // 🆕 Ajouter cette ligne

  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const hasActiveCashierSession = useSessionStore((state) =>
    Boolean(state.cashierSession?.status === 'active')
  );
  const canUseLCD = useSessionStore((state) =>
    Boolean(
      state.lcdStatus?.owned &&
        state.lcdStatus?.owner?.cashier_id === state.user?.id &&
        state.cashierSession?.status === 'active'
    )
  );
  const lcdError = useSessionStore((state) => state.lcdError);
  const lcd = useSessionStore((state) => state.lcd);

  // ✅ STORE PANIER
  const { addToCart, error, setError } = useCashierStore();

  // ✅ GESTION AJOUT PRODUIT AVEC LCD ZUSTAND
  const handleProductFound = useCallback(
    async (product) => {
      // Vérifications de stock
      if (product.manage_stock && product.stock <= 0) {
        setError(`Produit "${product.name}" en rupture de stock`);
        return;
      }

      // Ajouter au panier
      addToCart(product, 1);
      setError(null);

      // ✅ AFFICHAGE PRIX VIA ZUSTAND LCD
      if (canUseLCD) {
        try {
          const productName =
            product.name.length > 20 ? product.name.substring(0, 17) + '...' : product.name;
          await lcd.showPrice(productName, product.price);
          console.log(`💰 [CASHIER PAGE] Prix affiché: ${productName} - ${product.price}€`);
        } catch (error) {
          console.debug('Erreur affichage produit LCD:', error.message);
        }
      }
    },
    [addToCart, setError, canUseLCD, lcd]
  );

  const handleCloseSession = async (closingData) => {
    try {
      await stopSession(closingData);
      setShowClosingModal(false);
    } catch (error) {
      console.error('Erreur fermeture session:', error);
    }
  };

  // ✅ RACCOURCIS CLAVIER
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape') setError(null);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setError]);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-4">
      {/* ✅ HEADER UNIFIÉ */}
      <SessionHeader
        onShowClosing={() => setShowClosingModal(true)}
        onShowReport={() => setShowReportModal(true)}
      />

      {/* ✅ NOUVEAU : Indicateur fond de caisse */}
      <DrawerIndicator />

      {/* ✅ AFFICHAGE DES ERREURS */}
      <ErrorDisplay cartError={error} lcdError={lcdError} onClearCartError={() => setError(null)} />

      {/* ✅ INTERFACE PRINCIPALE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        <div className="lg:col-span-1">
          {/* ✅ COMPOSANT ProductSearch AVEC LES NOUVELLES ROUTES */}
          <ProductSearch onProductFound={handleProductFound} disabled={!hasActiveCashierSession} />
        </div>
        <div className="lg:col-span-2">
          <Cart />
        </div>
      </div>

      {/* ✅ MODALES */}
      <PaymentModal />
      <ReceiptModal />
      <DrawerMovementModal />
      <DrawerClosingModal
        isOpen={showClosingModal}
        onClose={() => setShowClosingModal(false)}
        onConfirm={handleCloseSession}
      />

      <DrawerReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
    </div>
  );
};

export default CashierPage;
