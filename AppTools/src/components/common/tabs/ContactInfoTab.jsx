// src/features/common/tabs/ContactInfoTab.jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Building, Mail, Phone, MapPin } from 'lucide-react';

const ContactInfoTab = ({
  contact,
  // Nouvelles props pour le mode édition
  editable = false,
}) => {
  // Récupération du contexte du formulaire si en mode édition
  const formContext = editable ? useFormContext() : null;
  // Destructuration sécurisée pour éviter l'erreur
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;

  // Classe de base pour les champs de formulaire
  const getInputClass = (fieldName) => {
    const error = errors && errors.contact && errors.contact[fieldName];
    return `w-full px-3 py-2 border ${
      error ? 'border-red-500' : 'border-gray-300'
    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Informations de contact
        </h2>

        {editable ? (
          // Mode édition
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Building className="h-4 w-4 inline mr-1" /> Nom du contact
              </label>
              <input
                type="text"
                {...register('contact.name')}
                className={getInputClass('name')}
                placeholder="Nom du contact"
              />
              {errors?.contact?.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                  {errors.contact.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Mail className="h-4 w-4 inline mr-1" /> Email
              </label>
              <input
                type="email"
                {...register('contact.email')}
                className={getInputClass('email')}
                placeholder="Email de contact"
              />
              {errors?.contact?.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                  {errors.contact.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Phone className="h-4 w-4 inline mr-1" /> Téléphone
              </label>
              <input
                type="text"
                {...register('contact.phone')}
                className={getInputClass('phone')}
                placeholder="Numéro de téléphone"
              />
              {errors?.contact?.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                  {errors.contact.phone.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <MapPin className="h-4 w-4 inline mr-1" /> Adresse
              </label>
              <textarea
                {...register('contact.address')}
                className={`${getInputClass('address')} min-h-[100px]`}
                placeholder="Adresse complète"
                rows={3}
              />
              {errors?.contact?.address && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                  {errors.contact.address.message}
                </p>
              )}
            </div>
          </div>
        ) : (
          // Mode lecture
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contact && Object.keys(contact).length > 0 ? (
              <>
                {contact.name && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <Building className="h-4 w-4 mr-1" /> Nom du contact
                    </h3>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">{contact.name}</p>
                  </div>
                )}

                {contact.email && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <Mail className="h-4 w-4 mr-1" /> Email
                    </h3>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {contact.email}
                      </a>
                    </p>
                  </div>
                )}

                {contact.phone && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <Phone className="h-4 w-4 mr-1" /> Téléphone
                    </h3>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </p>
                  </div>
                )}

                {contact.address && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" /> Adresse
                    </h3>
                    <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-line">
                      {contact.address}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 col-span-2">
                Aucune information de contact disponible
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactInfoTab;
