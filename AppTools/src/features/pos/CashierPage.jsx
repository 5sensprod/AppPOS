// src/features/pos/CashierPage.jsx - VERSION FINALE PROPRE
import React, { useEffect, useCallback, useState } from 'react';
import { useCashierStore } from './stores/cashierStore';
import { useSessionStore } from '../../stores/sessionStore';
import SessionHeader from './components/SessionHeader';
import ProductSearch from './components/ProductSearch';
import Cart from './components/Cart';
import PaymentModal from './components/PaymentModal';
import ReceiptModal from './components/ReceiptModal';
import DrawerIndicator from './components/DrawerIndicator';
import DrawerMovementModal from './components/DrawerMovementModal';
import DrawerClosingModal from './components/DrawerClosingModal';
import DrawerReportModal from './components/DrawerReportModal';
import ReportHistoryModal from './components/ReportHistoryModal';
import SessionOpeningModal from './components/SessionOpeningModal';

const CashierPage = () => {
  // États pour les modales
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLCDModal, setShowLCDModal] = useState(false);
  const [lcdPreselected, setLcdPreselected] = useState(false);

  // Stores
  const user = useSessionStore((state) => state.user);
  const stopSession = useSessionStore((state) => state.stopSession);
  const sessionLoading = useSessionStore((state) => state.sessionLoading);
  const lcdPorts = useSessionStore((state) => state.lcdPorts);
  const lcdLoading = useSessionStore((state) => state.lcdLoading);
  const lcdError = useSessionStore((state) => state.lcdError);
  const requestLCD = useSessionStore((state) => state.requestLCD);
  const startSession = useSessionStore((state) => state.startSession);

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
  const lcd = useSessionStore((state) => state.lcd);

  const { addToCart, error, setError } = useCashierStore();

  // Handlers
  const handleShowLCDConfig = () => {
    setLcdPreselected(true);
    setShowLCDModal(true);
  };

  const handleUnifiedSessionOpen = async (sessionData) => {
    try {
      const { useLCD, lcdPort, lcdConfig, drawer, lcdOnly } = sessionData;

      if (lcdOnly) {
        // Mode LCD seulement
        await requestLCD(
          lcdPort,
          lcdConfig || {
            baudRate: 9600,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
          }
        );
        console.log('✅ LCD connecté');
      } else {
        // Session complète
        await startSession(useLCD ? lcdPort : null, useLCD ? lcdConfig : {}, drawer);
        console.log('✅ Session + fond ouverts');
      }

      setShowLCDModal(false);
      setLcdPreselected(false);
    } catch (error) {
      console.error('Erreur ouverture session/LCD:', error);
    }
  };

  const handleProductFound = useCallback(
    async (product) => {
      // ✅ CORRECTION : Autoriser les stocks 0 et négatifs
      // Configuration
      const ALLOW_NEGATIVE_STOCK = true; // Mettre à false pour bloquer

      if (!ALLOW_NEGATIVE_STOCK && product.manage_stock && product.stock <= 0) {
        setError(`Produit "${product.name}" en rupture de stock`);
        return;
      }

      // ✅ OPTIONNEL : Afficher un warning si stock 0
      if (ALLOW_NEGATIVE_STOCK && product.manage_stock && product.stock <= 0) {
        console.warn(`⚠️ Vente avec stock négatif: ${product.name} (stock: ${product.stock})`);
      }

      try {
        // Aj
        // Ajouter au panier
        addToCart(product, 1);
        setError(null);

        // ✅ NOUVEAU : Affichage prix produit sur LCD
        if (canUseLCD) {
          const productNameTruncated =
            product.name.length > 20 ? product.name.substring(0, 20) : product.name;

          await lcd.writeMessage(productNameTruncated, `${product.price.toFixed(2)}EUR`);
          console.log(
            `💰 [CASHIER PAGE] Produit affiché: ${productNameTruncated} - ${product.price}€`
          );
        }
      } catch (error) {
        console.error('Erreur ajout produit:', error);
        setError(`Erreur lors de l'ajout: ${error.message}`);
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

  // Raccourcis clavier
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
      {/* Header avec callbacks */}
      <SessionHeader
        onShowClosing={() => setShowClosingModal(true)}
        onShowReport={() => setShowReportModal(true)}
        onShowHistory={() => setShowHistoryModal(true)}
        onShowLCDConfig={handleShowLCDConfig}
      />

      {/* Indicateur fond de caisse */}
      <DrawerIndicator />

      {/* Interface principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        <div className="lg:col-span-1">
          <ProductSearch onProductFound={handleProductFound} disabled={!hasActiveCashierSession} />
        </div>
        <div className="lg:col-span-2">
          <Cart />
        </div>
      </div>

      {/* Modales existantes */}
      <PaymentModal />
      <ReceiptModal />
      <DrawerMovementModal />
      <DrawerClosingModal
        isOpen={showClosingModal}
        onClose={() => setShowClosingModal(false)}
        onConfirm={handleCloseSession}
      />
      <DrawerReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
      <ReportHistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} />

      {/* Modale LCD unifiée */}
      {showLCDModal && (
        <SessionOpeningModal
          isOpen={showLCDModal}
          onClose={() => {
            setShowLCDModal(false);
            setLcdPreselected(false);
          }}
          onConfirm={handleUnifiedSessionOpen}
          loading={sessionLoading || lcdLoading}
          lcdPorts={lcdPorts}
          lcdPreselected={lcdPreselected}
          lcdOnly={lcdPreselected}
          lcdError={lcdError}
        />
      )}
    </div>
  );
};

export default CashierPage;
