// src/components/common/EntityForm.jsx
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Save, ArrowLeft, Loader, AlertTriangle, Check } from 'lucide-react';
import { TabNavigation, ActionButton, InfoCard } from '../ui';

/**
 * Composant de formulaire générique pour créer et éditer des entités
 */
const EntityForm = ({
  // Configuration
  fields = [],
  entityName = '',
  schema = null,
  isNew = true,
  // Initialisation
  initialValues = {},
  // Données associées (pour les relations)
  relatedData = {},
  // Handlers
  onSubmit,
  onCancel,
  // État du formulaire
  isLoading = false,
  error = null,
  successMessage = null,
  // Style et apparence
  buttonLabel = 'Enregistrer',
  formTitle = '',
  // Configuration d'affichage
  layout = 'single', // 'single' | 'tabs'
  tabs = [],
}) => {
  // Générer un schéma Yup à partir des champs si aucun n'est fourni
  const formSchema = schema || generateSchemaFromFields(fields);

  // Configuration de React Hook Form
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting, isValid },
  } = useForm({
    resolver: yupResolver(formSchema),
    defaultValues: initialValues,
    mode: 'onChange',
  });

  // État du formulaire
  const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].id : 'general');
  const [serverError, setServerError] = useState(error);
  const [success, setSuccess] = useState(successMessage);

  // Mettre à jour les valeurs du formulaire lorsque les valeurs initiales changent
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  // Mettre à jour les erreurs du serveur lorsqu'elles changent
  useEffect(() => {
    setServerError(error);
  }, [error]);

  // Mettre à jour le message de succès lorsqu'il change
  useEffect(() => {
    setSuccess(successMessage);
  }, [successMessage]);

  // Gérer la soumission du formulaire
  const handleFormSubmit = async (data) => {
    setServerError(null);
    setSuccess(null);

    try {
      await onSubmit(data);
    } catch (err) {
      setServerError(err.message || 'Une erreur est survenue lors de la soumission du formulaire');
    }
  };

  // Générer un schéma Yup à partir des champs
  function generateSchemaFromFields(fields) {
    const schemaShape = {};

    fields.forEach((field) => {
      let fieldSchema;

      // Déterminer le type de champ Yup en fonction du type de champ
      switch (field.type) {
        case 'text':
        case 'textarea':
        case 'select':
        case 'email':
          fieldSchema = yup.string();
          if (field.type === 'email') fieldSchema = fieldSchema.email('Email invalide');
          break;
        case 'number':
          fieldSchema = yup.number().transform((value) => (isNaN(value) ? undefined : value));
          if (field.min !== undefined)
            fieldSchema = fieldSchema.min(field.min, `Doit être supérieur ou égal à ${field.min}`);
          if (field.max !== undefined)
            fieldSchema = fieldSchema.max(field.max, `Doit être inférieur ou égal à ${field.max}`);
          break;
        case 'checkbox':
          fieldSchema = yup.boolean();
          break;
        case 'date':
          fieldSchema = yup.date();
          break;
        case 'multiselect':
          fieldSchema = yup.array().of(yup.string());
          break;
        default:
          fieldSchema = yup.string();
      }

      // Ajouter les validations supplémentaires
      if (field.required) {
        fieldSchema = fieldSchema.required('Ce champ est requis');
      }

      if (field.validation) {
        // Appliquer des validations personnalisées si elles sont fournies
        if (field.validation.min)
          fieldSchema = fieldSchema.min(
            field.validation.min,
            `Minimum ${field.validation.min} caractères`
          );
        if (field.validation.max)
          fieldSchema = fieldSchema.max(
            field.validation.max,
            `Maximum ${field.validation.max} caractères`
          );
        if (field.validation.pattern)
          fieldSchema = fieldSchema.matches(
            field.validation.pattern,
            field.validation.message || 'Format invalide'
          );
      }

      schemaShape[field.name] = fieldSchema;
    });

    return yup.object().shape(schemaShape);
  }

  // Organiser les champs par onglet si nécessaire
  const getFieldsByTab = (tabId) => {
    if (layout !== 'tabs' || !tabs.length) return fields;

    return fields.filter((field) => field.tab === tabId);
  };

  // Rendu d'un champ en fonction de son type
  const renderField = (field) => {
    const fieldError = errors[field.name];

    // Classe de base pour tous les champs
    const baseInputClass = `block w-full rounded-md ${
      fieldError
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-600 dark:focus:border-red-500'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:focus:border-blue-500'
    } shadow-sm dark:bg-gray-700 dark:text-white`;

    // Wrapper du champ avec label et message d'erreur
    return (
      <div key={field.name} className={`mb-4 ${field.className || ''}`}>
        <label
          htmlFor={field.name}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {/* Champ de texte */}
        {field.type === 'text' && (
          <input
            type="text"
            id={field.name}
            {...register(field.name)}
            placeholder={field.placeholder || ''}
            disabled={field.disabled || isLoading}
            className={baseInputClass}
          />
        )}

        {/* Champ de texte multiligne */}
        {field.type === 'textarea' && (
          <textarea
            id={field.name}
            {...register(field.name)}
            rows={field.rows || 3}
            placeholder={field.placeholder || ''}
            disabled={field.disabled || isLoading}
            className={baseInputClass}
          />
        )}

        {/* Champ numérique */}
        {field.type === 'number' && (
          <input
            type="number"
            id={field.name}
            {...register(field.name)}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            placeholder={field.placeholder || ''}
            disabled={field.disabled || isLoading}
            className={baseInputClass}
          />
        )}

        {/* Champ email */}
        {field.type === 'email' && (
          <input
            type="email"
            id={field.name}
            {...register(field.name)}
            placeholder={field.placeholder || ''}
            disabled={field.disabled || isLoading}
            className={baseInputClass}
          />
        )}

        {/* Case à cocher */}
        {field.type === 'checkbox' && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field.name}
              {...register(field.name)}
              disabled={field.disabled || isLoading}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <label htmlFor={field.name} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {field.checkboxLabel || field.label}
            </label>
          </div>
        )}

        {/* Liste déroulante */}
        {field.type === 'select' && (
          <select
            id={field.name}
            {...register(field.name)}
            disabled={field.disabled || isLoading}
            className={baseInputClass}
          >
            {field.placeholder && (
              <option value="" disabled>
                {field.placeholder}
              </option>
            )}
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Liste déroulante multiple */}
        {field.type === 'multiselect' && (
          <Controller
            name={field.name}
            control={control}
            render={({ field: { onChange, value } }) => (
              <div className="space-y-2">
                {field.options.map((option) => (
                  <div key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`${field.name}-${option.value}`}
                      checked={value?.includes(option.value)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newValue = [...(value || [])];

                        if (checked) {
                          if (!newValue.includes(option.value)) {
                            newValue.push(option.value);
                          }
                        } else {
                          const index = newValue.indexOf(option.value);
                          if (index !== -1) {
                            newValue.splice(index, 1);
                          }
                        }

                        onChange(newValue);
                      }}
                      disabled={field.disabled || isLoading}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <label
                      htmlFor={`${field.name}-${option.value}`}
                      className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          />
        )}

        {/* Champ date */}
        {field.type === 'date' && (
          <input
            type="date"
            id={field.name}
            {...register(field.name)}
            disabled={field.disabled || isLoading}
            className={baseInputClass}
          />
        )}

        {/* Message d'erreur */}
        {fieldError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-500">{fieldError.message}</p>
        )}

        {/* Texte d'aide */}
        {field.helpText && !fieldError && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{field.helpText}</p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      {/* En-tête du formulaire */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {formTitle || `${isNew ? 'Créer' : 'Modifier'} ${entityName}`}
            </h3>
          </div>
        </div>
      </div>

      {/* Messages d'erreur/succès */}
      {serverError && (
        <InfoCard variant="danger" icon={AlertTriangle}>
          <p className="text-sm text-red-700 dark:text-red-200">{serverError}</p>
        </InfoCard>
      )}

      {success && (
        <InfoCard variant="success" icon={Check}>
          <p className="text-sm text-green-700 dark:text-green-200">{success}</p>
        </InfoCard>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="px-4 py-5 sm:p-6">
          {/* Onglets */}
          {layout === 'tabs' && tabs.length > 0 && (
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              className="mb-6"
            />
          )}

          {/* Champs */}
          {layout === 'tabs' ? (
            <div>
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`space-y-4 ${activeTab === tab.id ? 'block' : 'hidden'}`}
                >
                  {getFieldsByTab(tab.id).map(renderField)}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className={`sm:col-span-${field.colSpan || 3} ${field.className || ''}`}
                >
                  {renderField(field)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions du formulaire */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-right sm:px-6 border-t border-gray-200 dark:border-gray-600">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Annuler
            </button>
          )}
          <ActionButton
            type="submit"
            icon={isLoading || isSubmitting ? Loader : Save}
            label={isLoading || isSubmitting ? 'Chargement...' : buttonLabel}
            variant="primary"
            disabled={isLoading || isSubmitting || (!isDirty && !isNew)}
            isLoading={isLoading || isSubmitting}
          />
        </div>
      </form>
    </div>
  );
};

export default EntityForm;
