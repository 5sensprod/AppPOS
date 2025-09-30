// src/features/products/components/sections/ProductDescription.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  Image,
  MessageSquare,
  Paperclip,
  X,
  ChevronUp,
  Check,
  FileText,
  Wand2,
} from 'lucide-react';
import apiService from '../../../../services/api';
import {
  formatDescriptionForDisplay,
  cleanAIGeneratedContent,
} from '../../../../utils/formatDescription';

/**
 * Composant unifié harmonisé pour la gestion des descriptions de produit
 * - Style cohérent avec le système atomique
 * - Gère à la fois l'affichage et l'édition
 * - Intègre l'assistance IA
 */
const ProductDescription = ({ product, editable = false, register, setValue, watch, errors }) => {
  // États et références
  const [chatMode, setChatMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const chatEndRef = useRef(null);
  const editorRef = useRef(null);

  // Fonction pour basculer vers le mode chat
  const toggleChatMode = () => {
    if (!chatMode) {
      const initialMessages = [
        {
          type: 'system',
          content: `Bonjour ! Je suis votre assistant pour créer une description captivante pour "${product?.name || 'votre produit'}". Vous pouvez me partager des informations spécifiques, des images, ou me poser des questions.`,
        },
      ];
      const currentDescription = watch ? watch('description') : '';
      if (currentDescription && currentDescription.trim() !== '') {
        initialMessages.push({
          type: 'system',
          content: `J'ai remarqué que vous avez déjà commencé une description. Je la prendrai en compte dans nos échanges.`,
        });
      }
      setMessages(initialMessages);
    }
    setChatMode(!chatMode);
  };

  // Récupérer la description de l'IA et éviter le problème de perte de focus
  const handleEditorInput = (e) => {
    if (setValue) {
      // Mémoriser la position du curseur avant de mettre à jour
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(editorRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const start = preSelectionRange.toString().length;

      // Mettre à jour la valeur
      setValue('description', e.currentTarget.innerHTML, {
        shouldValidate: true,
        shouldDirty: true,
      });

      // Permettre au navigateur de terminer le rendu
      setTimeout(() => {
        if (editorRef.current) {
          // Restaurer la position du curseur
          const newRange = document.createRange();
          const sel = window.getSelection();

          let charIndex = 0;
          let foundStart = false;

          // Fonction pour parcourir les nœuds et trouver la position
          function traverseNodes(node) {
            if (node.nodeType === 3) {
              // Nœud texte
              const nextCharIndex = charIndex + node.length;
              if (!foundStart && start >= charIndex && start <= nextCharIndex) {
                newRange.setStart(node, start - charIndex);
                foundStart = true;
              }
              charIndex = nextCharIndex;
            } else if (node.nodeType === 1) {
              // Nœud élément
              // Parcourir les enfants
              for (let i = 0; i < node.childNodes.length; i++) {
                traverseNodes(node.childNodes[i]);
                if (foundStart) break;
              }
            }
          }

          // Parcourir les nœuds de l'éditeur
          traverseNodes(editorRef.current);

          // Si la position a été trouvée, appliquer la sélection
          if (foundStart) {
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
          }
        }
      }, 0);
    }
  };

  // Fonction pour envoyer un message dans le chat
  const sendMessage = async () => {
    if (!userInput.trim() && attachedFiles.length === 0) return;

    const newUserMessage = {
      type: 'user',
      content: userInput,
      files: [...attachedFiles],
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setUserInput('');
    setAttachedFiles([]);
    setLoading(true);

    try {
      // Préparer les données pour l'API
      const formData = new FormData();
      formData.append('message', userInput);
      formData.append('name', product?.name || '');

      // Ajouter le SKU/référence si disponible
      if (product?.sku) {
        formData.append('sku', product.sku);
      }
      if (product?.category_info?.primary?.name) {
        formData.append('category', product.category_info.primary.name);
      }
      if (product?.brand_ref?.name) {
        formData.append('brand', product.brand_ref.name);
      }
      if (product?.price) {
        formData.append('price', product.price.toString());
      }

      // Ajouter la description actuelle
      const currentDescription = watch ? watch('description') : '';
      if (currentDescription && currentDescription.trim() !== '') {
        formData.append('currentDescription', currentDescription);
      }

      // Ajouter les spécifications
      if (product?.specifications) {
        try {
          formData.append('specifications', JSON.stringify(product.specifications));
        } catch (specErr) {
          console.warn('Erreur lors de la sérialisation des spécifications:', specErr);
        }
      }

      // Ajouter les fichiers
      attachedFiles.forEach((file) => {
        formData.append('file', file);
      });

      // Ajouter les messages précédents pour maintenir le contexte
      formData.append('conversation', JSON.stringify(messages));

      // Appel à l'API
      const response = await apiService.post('/api/descriptions/chat', formData);

      const aiResponse = response.data.data?.description || response.data.description;

      const jsonForChat = response.data.data?.message || response.data.message;

      const newAiMessage = {
        type: 'assistant',
        content: aiResponse, // Affiche le HTML formaté dans le chat
        description: aiResponse, // Utilise le HTML pour appliquer
      };

      setMessages((prev) => [...prev, newAiMessage]);
    } catch (error) {
      console.error("Erreur lors de la communication avec l'IA:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: 'error',
          content: `Une erreur est survenue lors de la génération de la réponse: ${error.message}`,
        },
      ]);
      setError("Erreur de communication avec l'IA");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour gérer l'upload de fichiers
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isAcceptableSize = file.size <= 5 * 1024 * 1024; // 5MB max
      return (isImage || isPDF) && isAcceptableSize;
    });
    setAttachedFiles((prev) => [...prev, ...validFiles]);
  };

  // Fonction pour supprimer un fichier attaché
  const removeAttachedFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Fonction pour appliquer une description générée par l'IA
  const applyGeneratedDescription = (description) => {
    if (!description) {
      setError('Aucune description disponible à appliquer');
      return;
    }
    if (setValue && typeof setValue === 'function') {
      setValue('description', description, { shouldValidate: true, shouldDirty: true });
      setSuccess(true);
      setChatMode(false);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    }
  };

  // Scroll automatique vers le bas du chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Rendu en mode lecture seule (non éditable) - HARMONISÉ
  if (!editable) {
    return (
      <div>
        {/* ✅ Header harmonisé avec icône */}
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            <span>Description du produit</span>
          </div>
        </h2>

        {!product?.description ? (
          // ✅ Style atomique pour champ vide
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-md min-h-[120px] flex items-center">
            <span className="text-gray-500 dark:text-gray-400 italic text-sm">
              Aucune description disponible
            </span>
          </div>
        ) : (
          // ✅ Style atomique pour contenu (chip bleu)
          <div className="px-4 py-4 rounded-lg border bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700 min-h-[120px]">
            <div className="prose dark:prose-invert max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: formatDescriptionForDisplay(product.description),
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Rendu en mode édition - HARMONISÉ
  return (
    <div>
      {/* ✅ Header harmonisé avec icône et bouton */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            <span>Description du produit</span>
          </div>
        </h2>

        <button
          type="button"
          onClick={toggleChatMode}
          className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Générer avec l'IA"
        >
          {chatMode ? (
            <>
              <FileText className="h-4 w-4 mr-1" />
              Éditeur
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-1" />
              Générer avec IA
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Mode éditeur standard */}
        {!chatMode && (
          <div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="prose dark:prose-invert max-w-none w-full px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md min-h-[250px] focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors"
              dangerouslySetInnerHTML={{
                __html: formatDescriptionForDisplay(watch('description') || ''),
              }}
              onInput={handleEditorInput}
            />

            {/* ✅ Texte d'aide harmonisé */}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Rédigez une description manuellement ou cliquez sur "Générer avec IA" pour une
              assistance interactive.
            </p>
          </div>
        )}

        {/* Mode chat avec l'IA - Style amélioré */}
        {chatMode && (
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
            {/* En-tête du chat harmonisé */}
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 border-b border-blue-200 dark:border-blue-700">
              <div className="flex items-center">
                <Wand2 className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Assistant de description produit
                </h3>
              </div>
            </div>

            {/* Zone des messages */}
            <div className="bg-white dark:bg-gray-900 p-4 h-96 overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${message.type === 'user' ? 'flex flex-row-reverse' : 'flex'}`}
                >
                  <div
                    className={`max-w-3/4 p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                        : message.type === 'error'
                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
                          : message.type === 'system'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 italic'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {message.type === 'assistant' && message.content?.includes('<') ? (
                      <div
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: formatDescriptionForDisplay(
                            cleanAIGeneratedContent(message.content)
                          ),
                        }}
                      />
                    ) : (
                      <p>{message.content}</p>
                    )}

                    {/* Afficher les fichiers attachés aux messages de l'utilisateur */}
                    {message.files && message.files.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.files.map((file, fileIndex) => (
                          <div
                            key={fileIndex}
                            className="bg-white dark:bg-gray-700 rounded p-1 text-xs flex items-center"
                          >
                            {file.type.startsWith('image/') ? (
                              <Image size={12} className="mr-1" />
                            ) : (
                              <Paperclip size={12} className="mr-1" />
                            )}
                            {file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bouton pour appliquer la description générée (pour les messages de l'IA) */}
                    {message.type === 'assistant' && message.description && (
                      <button
                        onClick={() => applyGeneratedDescription(message.description)}
                        className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded flex items-center w-full justify-center hover:bg-green-700 transition-colors"
                      >
                        <Check size={16} className="mr-2" /> Utiliser cette description
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Zone de saisie et d'envoi */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-600">
              {/* Zone des fichiers attachés */}
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full px-3 py-1 text-xs flex items-center"
                    >
                      {file.type.startsWith('image/') ? (
                        <Image size={12} className="mr-1" />
                      ) : (
                        <Paperclip size={12} className="mr-1" />
                      )}
                      {file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name}
                      <button
                        onClick={() => removeAttachedFile(index)}
                        className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value);
                      // Ajuster la hauteur automatiquement
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                    }}
                    placeholder="Décrivez votre produit ou posez une question..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white rounded-md resize-none overflow-y-auto focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows="1"
                    style={{ minHeight: '44px', maxHeight: '150px' }}
                  />
                </div>

                <label className="cursor-pointer p-3 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                  />
                  <Paperclip size={18} className="text-gray-500 dark:text-gray-400" />
                </label>

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading}
                  className="p-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <ChevronUp size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages d'état harmonisés */}
        {error && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="px-3 py-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md">
            <p className="text-sm text-green-600 dark:text-green-400">
              Description mise à jour avec succès!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDescription;
