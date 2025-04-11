// src/features/products/components/sections/ProductDescription.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Image, MessageSquare, Paperclip, X, ChevronUp, Check } from 'lucide-react';
import apiService from '../../../../services/api';
import {
  formatDescriptionForDisplay,
  cleanAIGeneratedContent,
} from '../../../../utils/formatDescription';

/**
 * Composant unifié pour la gestion des descriptions de produit
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
      const aiResponse = response.data.data?.message || response.data.message;
      const newAiMessage = {
        type: 'assistant',
        content: aiResponse,
        description: response.data.data?.description || response.data.description,
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

  // Rendu en mode lecture seule (non éditable)
  if (!editable) {
    if (!product?.description) {
      return (
        <div className="mb-6 mt-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Description du produit
          </h3>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 italic">Aucune description disponible</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-6 mt-0 product-description">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
          Description du produit
        </h3>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border dark:border-gray-700">
          <div className="prose dark:prose-invert max-w-none">
            <div
              dangerouslySetInnerHTML={{ __html: formatDescriptionForDisplay(product.description) }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Rendu en mode édition
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Description du produit
        </h3>
        <button
          type="button"
          onClick={toggleChatMode}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {chatMode ? (
            <>Revenir à l'éditeur</>
          ) : (
            <>
              <MessageSquare size={16} className="mr-2" />
              Générer avec IA
            </>
          )}
        </button>
      </div>

      {/* Mode éditeur standard */}
      {!chatMode && (
        <>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="prose dark:prose-invert max-w-none w-full px-6 py-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md min-h-[250px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            dangerouslySetInnerHTML={{
              __html: formatDescriptionForDisplay(watch('description') || ''),
            }}
            onInput={handleEditorInput}
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Rédigez une description manuellement ou cliquez sur "Générer avec IA" pour une
            assistance interactive.
          </p>
        </>
      )}

      {/* Mode chat avec l'IA */}
      {chatMode && (
        <div className="border rounded-lg overflow-hidden dark:border-gray-700 mb-4">
          {/* En-tête du chat */}
          <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Assistant de description produit
            </h4>
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
                      className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded flex items-center w-full justify-center"
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
          <div className="bg-gray-50 dark:bg-gray-800 p-3 border-t border-gray-200 dark:border-gray-700">
            {/* Zone des fichiers attachés */}
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-1 text-xs flex items-center"
                  >
                    {file.type.startsWith('image/') ? (
                      <Image size={12} className="mr-1" />
                    ) : (
                      <Paperclip size={12} className="mr-1" />
                    )}
                    {file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name}
                    <button
                      onClick={() => removeAttachedFile(index)}
                      className="ml-1 text-red-500 hover:text-red-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end">
              <div className="flex-1 mr-2 relative">
                <textarea
                  value={userInput}
                  onChange={(e) => {
                    setUserInput(e.target.value);
                    // Ajuster la hauteur automatiquement
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                  }}
                  placeholder="Décrivez votre produit ou posez une question..."
                  className="w-full p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md resize-none overflow-y-auto"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows="1"
                  style={{ minHeight: '40px', maxHeight: '150px' }}
                />
              </div>
              <label className="cursor-pointer p-2 border rounded-md mr-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                />
                <Paperclip size={18} className="text-gray-500" />
              </label>
              <button
                type="button"
                onClick={sendMessage}
                disabled={loading}
                className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <ChevronUp size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>}
      {success && (
        <p className="mt-1 text-sm text-green-600 dark:text-green-500">
          Description mise à jour avec succès!
        </p>
      )}
    </div>
  );
};

export default ProductDescription;
