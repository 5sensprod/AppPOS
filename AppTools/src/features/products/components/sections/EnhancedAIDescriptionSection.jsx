// src/features/products/components/sections/EnhancedAIDescriptionSection.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  Image,
  Upload,
  MessageSquare,
  Paperclip,
  X,
  ChevronUp,
  Check,
} from 'lucide-react';
import apiService from '../../../../services/api';
import imageProxyService from '../../../../services/imageProxyService';

const EnhancedAIDescriptionSection = ({ product, editable, register, setValue, watch }) => {
  // État pour le mode d'interface (texte simple ou chat IA)
  const [chatMode, setChatMode] = useState(false);

  // États existants
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [customImage, setCustomImage] = useState(null);
  const [customImagePreview, setCustomImagePreview] = useState(null);

  // États pour le mode chat
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const chatEndRef = useRef(null);

  // État pour la description formatée
  const [formattedDescription, setFormattedDescription] = useState({
    title: '',
    intro: '',
    highlights: [],
    technicalTable: '',
    usage: '',
  });

  // Fonction pour formater la description générée
  const parseGeneratedDescription = (rawDescription) => {
    const result = {
      title: '',
      intro: '',
      highlights: [],
      technicalTable: '',
      usage: '',
    };

    // Extraire le titre s'il existe (à partir d'une balise h1 ou de markdown)
    const titleMatch =
      rawDescription.match(/<h1[^>]*>(.*?)<\/h1>/i) || rawDescription.match(/^#\s+(.*)$/m);
    if (titleMatch && titleMatch[1]) {
      result.title = titleMatch[1].trim();
    }

    // Extraire la section du tableau technique (préserver intact)
    const tableMatch = rawDescription.match(/<table>[\s\S]*?<\/table>/);
    if (tableMatch) {
      result.technicalTable = tableMatch[0];
    }

    // Extraire l'introduction (tout texte avant les points forts)
    const pointsFortsIndex = rawDescription.indexOf('<h2>Points Forts</h2>');
    if (pointsFortsIndex > -1) {
      let intro = rawDescription.substring(0, pointsFortsIndex);
      // Supprimer le titre s'il a été trouvé
      if (titleMatch) {
        intro = intro.replace(/<h1[^>]*>.*?<\/h1>/i, '').replace(/^#\s+.*$/m, '');
      }
      result.intro = intro.trim();
    }

    // Extraire les points forts
    const highlightsMatch = rawDescription.match(/<ul>([\s\S]*?)<\/ul>/);
    if (highlightsMatch && highlightsMatch[1]) {
      result.highlights = highlightsMatch[1]
        .match(/<li>([\s\S]*?)<\/li>/g)
        .map((item) => item.replace(/<\/?li>/g, '').trim());
    }

    // Extraire les conseils d'utilisation
    const usageMatch = rawDescription.match(/<h2>Conseils d'utilisation<\/h2>([\s\S]*?)(?=$|<h2>)/);
    if (usageMatch && usageMatch[1]) {
      result.usage = usageMatch[1].trim();
    }

    return result;
  };

  // Fonction pour basculer vers le mode chat
  const toggleChatMode = () => {
    if (!chatMode) {
      // Si on passe en mode chat, initialiser avec un message de bienvenue
      const initialMessages = [
        {
          type: 'system',
          content: `Bonjour ! Je suis votre assistant pour créer une description captivante pour "${product?.name || 'votre produit'}". Vous pouvez me partager des informations spécifiques, des images, ou me poser des questions.`,
        },
      ];

      // Si une description existe déjà, l'ajouter au contexte
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

  // Fonction pour envoyer un message dans le chat
  const sendMessage = async () => {
    if (!userInput.trim() && attachedFiles.length === 0) return;

    // Ajouter le message de l'utilisateur
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

      // Ajouter les fichiers - CORRECTION ICI pour que chaque image soit prise en compte
      // Utiliser le nom générique 'file' pour tous les fichiers
      attachedFiles.forEach((file) => {
        formData.append('file', file);
      });

      // Ajouter les messages précédents pour maintenir le contexte
      formData.append('conversation', JSON.stringify(messages));

      // Appel à l'API
      const response = await apiService.post('/api/descriptions/chat', formData);

      // Traiter la réponse
      const aiResponse = response.data.data?.message || response.data.message;

      // Ajouter la réponse de l'IA
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

  // Fonction pour ajouter des fichiers
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);

    // Validations des fichiers
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

      // Analyser la description pour l'affichage formaté
      const parsed = parseGeneratedDescription(description);
      setFormattedDescription(parsed);

      setSuccess(true);

      // Optionnel: revenir au mode édition standard
      setChatMode(false);

      // Afficher un message temporaire de succès
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

  if (!editable) {
    return null; // Ne rien afficher en mode lecture
  }

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

      {/* Mode éditeur de texte standard */}
      {!chatMode && (
        <>
          {register && (
            <textarea
              {...register('description')}
              rows={8}
              className="w-full px-3 py-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md"
              placeholder="Description du produit..."
            />
          )}

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
                  {message.content}

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

            <div className="flex items-center">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Décrivez votre produit ou posez une question..."
                className="flex-1 p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md mr-2"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />

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

export default EnhancedAIDescriptionSection;
