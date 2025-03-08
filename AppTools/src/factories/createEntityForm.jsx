// src/factories/createEntityForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function createEntityForm(options) {
  const { entityName, formFields, submitHandler, cancelPath = '' } = options;

  return function EntityFormComponent({
    initialData = {},
    isEditing = false,
    isLoading = false,
    error = null,
    onSubmit,
    ...props
  }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState(initialData);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Gestion des changements de champs
    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      const fieldValue = type === 'checkbox' ? checked : value;

      setFormData((prev) => ({
        ...prev,
        [name]: fieldValue,
      }));

      // Marquer le champ comme touché
      if (!touched[name]) {
        setTouched((prev) => ({
          ...prev,
          [name]: true,
        }));
      }

      // Effacer l'erreur si le champ est modifié
      if (errors[name]) {
        setErrors((prev) => ({
          ...prev,
          [name]: null,
        }));
      }
    };

    // Validation du formulaire
    const validateForm = () => {
      const newErrors = {};
      let isValid = true;

      // Vérifier les champs requis
      formFields.forEach((field) => {
        if (field.required && (!formData[field.name] || formData[field.name] === '')) {
          newErrors[field.name] = `${field.label} est requis`;
          isValid = false;
        }
      });

      setErrors(newErrors);
      return isValid;
    };

    // Soumission du formulaire
    const handleSubmit = async (e) => {
      e.preventDefault();

      // Marquer tous les champs comme touchés
      const allTouched = formFields.reduce((acc, field) => {
        acc[field.name] = true;
        return acc;
      }, {});
      setTouched(allTouched);

      // Validation
      if (!validateForm()) {
        return;
      }

      try {
        await onSubmit(formData);

        // Rediriger vers la liste
        if (cancelPath) {
          navigate(cancelPath);
        }
      } catch (error) {
        console.error('Erreur lors de la soumission du formulaire :', error);

        // Si l'erreur contient des erreurs de validation
        if (error.response && error.response.data && error.response.data.errors) {
          setErrors(error.response.data.errors);
        }
      }
    };

    // Annulation du formulaire
    const handleCancel = () => {
      if (cancelPath) {
        navigate(cancelPath);
      }
    };

    // Rendu des champs du formulaire
    const renderField = (field) => {
      const { name, label, type, options, ...rest } = field;
      const hasError = touched[name] && errors[name];

      switch (type) {
        case 'text':
        case 'number':
        case 'email':
        case 'password':
        case 'tel':
        case 'url':
        case 'date':
          return (
            <div key={name} className="mb-4">
              <label
                htmlFor={name}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={type}
                id={name}
                name={name}
                value={formData[name] || ''}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${
                  hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white`}
                {...rest}
              />
              {hasError && <p className="mt-1 text-sm text-red-500">{errors[name]}</p>}
            </div>
          );

        case 'textarea':
          return (
            <div key={name} className="mb-4">
              <label
                htmlFor={name}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <textarea
                id={name}
                name={name}
                value={formData[name] || ''}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${
                  hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white`}
                {...rest}
              />
              {hasError && <p className="mt-1 text-sm text-red-500">{errors[name]}</p>}
            </div>
          );

        case 'select':
          return (
            <div key={name} className="mb-4">
              <label
                htmlFor={name}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <select
                id={name}
                name={name}
                value={formData[name] || ''}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${
                  hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white`}
                {...rest}
              >
                <option value="">Sélectionner...</option>
                {options &&
                  options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label || option.value}
                    </option>
                  ))}
              </select>
              {hasError && <p className="mt-1 text-sm text-red-500">{errors[name]}</p>}
            </div>
          );

        case 'checkbox':
          return (
            <div key={name} className="mb-4 flex items-center">
              <input
                type="checkbox"
                id={name}
                name={name}
                checked={formData[name] || false}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                {...rest}
              />
              <label htmlFor={name} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                {label}
              </label>
              {hasError && <p className="mt-1 text-sm text-red-500">{errors[name]}</p>}
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6" {...props}>
        {/* Affichage des erreurs globales */}
        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-100 rounded-lg">
            {error}
          </div>
        )}

        {/* Rendu des champs */}
        {formFields.map(renderField)}

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    );
  };
}
