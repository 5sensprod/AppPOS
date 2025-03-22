// src/features/common/tabs/ContactInfoTab.jsx
import React from 'react';
import { Building, Mail, Phone, MapPin } from 'lucide-react';

const ContactInfoTab = ({ contact }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Informations de contact
        </h2>

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
      </div>
    </div>
  );
};

export default ContactInfoTab;
