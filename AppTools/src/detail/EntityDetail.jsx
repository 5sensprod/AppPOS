// src/components/detail/EntityDetail.jsx
import React, { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import TabRenderer from './TabRenderer';
import TabNavigation from '../components/organisms/TabNavigation';
import InfoCard from '../components/molecules/InfoCard';

const EntityDetail = ({
  entity = {},
  config,
  editable = false,
  onSubmit,
  onDelete,
  onCancel,
  validationSchema,
  isLoading = false,
  error = null,
  success = null,
  defaultValues = {},
}) => {
  const tabs = config.tabs || [];
  const [activeTabId, setActiveTabId] = useState(tabs.length > 0 ? tabs[0].id : null);

  const formMethods = useForm({
    defaultValues: { ...defaultValues, ...entity },
    resolver: validationSchema ? yupResolver(validationSchema) : undefined,
    mode: 'onChange',
  });

  const handleSubmit = formMethods.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (e) {
      console.error(e);
    }
  });

  const activeTabConfig = tabs.find((tab) => tab.id === activeTabId);

  if (error) {
    return (
      <InfoCard variant="danger" title="Erreur">
        <p>{error}</p>
      </InfoCard>
    );
  }

  if (isLoading && !entity) {
    return <p className="text-center py-10 text-gray-600 dark:text-gray-400">Chargement...</p>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {editable ? 'Modifier' : 'Détail'} {config.entityName}
      </h1>

      {tabs.length > 1 && (
        <TabNavigation tabs={tabs} activeTab={activeTabId} onTabChange={setActiveTabId} />
      )}

      {editable ? (
        <FormProvider {...formMethods}>
          <form onSubmit={handleSubmit}>
            <TabRenderer tabConfig={activeTabConfig} editable={true} />
            <div className="mt-6 flex gap-3">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                Enregistrer
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded"
              >
                Annuler
              </button>
            </div>
          </form>
        </FormProvider>
      ) : (
        <TabRenderer tabConfig={activeTabConfig} editable={false} />
      )}
    </div>
  );
};

export default EntityDetail;
